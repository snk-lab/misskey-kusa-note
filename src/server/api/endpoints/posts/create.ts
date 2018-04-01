/**
 * Module dependencies
 */
import $ from 'cafy';
import deepEqual = require('deep-equal');
import html from '../../../../common/text/html';
import parse from '../../../../common/text/parse';
import Post, { IPost, isValidText, isValidCw } from '../../../../models/post';
import User, { ILocalUser } from '../../../../models/user';
import Channel, { IChannel } from '../../../../models/channel';
import Following from '../../../../models/following';
import Mute from '../../../../models/mute';
import DriveFile from '../../../../models/drive-file';
import Watching from '../../../../models/post-watching';
import ChannelWatching from '../../../../models/channel-watching';
import { pack } from '../../../../models/post';
import watch from '../../common/watch-post';
import event, { pushSw, publishChannelStream } from '../../../../common/event';
import notify from '../../../../common/notify';
import getAcct from '../../../../common/user/get-acct';
import parseAcct from '../../../../common/user/parse-acct';
import config from '../../../../conf';

/**
 * Create a post
 *
 * @param {any} params
 * @param {any} user
 * @param {any} app
 * @return {Promise<any>}
 */
module.exports = (params, user: ILocalUser, app) => new Promise(async (res, rej) => {
	// Get 'text' parameter
	const [text, textErr] = $(params.text).optional.string().pipe(isValidText).$;
	if (textErr) return rej('invalid text');

	// Get 'cw' parameter
	const [cw, cwErr] = $(params.cw).optional.string().pipe(isValidCw).$;
	if (cwErr) return rej('invalid cw');

	// Get 'viaMobile' parameter
	const [viaMobile = false, viaMobileErr] = $(params.viaMobile).optional.boolean().$;
	if (viaMobileErr) return rej('invalid viaMobile');

	// Get 'tags' parameter
	const [tags = [], tagsErr] = $(params.tags).optional.array('string').unique().eachQ(t => t.range(1, 32)).$;
	if (tagsErr) return rej('invalid tags');

	// Get 'geo' parameter
	const [geo, geoErr] = $(params.geo).optional.nullable.strict.object()
		.have('coordinates', $().array().length(2)
			.item(0, $().number().range(-180, 180))
			.item(1, $().number().range(-90, 90)))
		.have('altitude', $().nullable.number())
		.have('accuracy', $().nullable.number())
		.have('altitudeAccuracy', $().nullable.number())
		.have('heading', $().nullable.number().range(0, 360))
		.have('speed', $().nullable.number())
		.$;
	if (geoErr) return rej('invalid geo');

	// Get 'mediaIds' parameter
	const [mediaIds, mediaIdsErr] = $(params.mediaIds).optional.array('id').unique().range(1, 4).$;
	if (mediaIdsErr) return rej('invalid mediaIds');

	let files = [];
	if (mediaIds !== undefined) {
		// Fetch files
		// forEach だと途中でエラーなどがあっても return できないので
		// 敢えて for を使っています。
		for (const mediaId of mediaIds) {
			// Fetch file
			// SELECT _id
			const entity = await DriveFile.findOne({
				_id: mediaId,
				'metadata.userId': user._id
			});

			if (entity === null) {
				return rej('file not found');
			} else {
				files.push(entity);
			}
		}
	} else {
		files = null;
	}

	// Get 'repostId' parameter
	const [repostId, repostIdErr] = $(params.repostId).optional.id().$;
	if (repostIdErr) return rej('invalid repostId');

	let repost: IPost = null;
	let isQuote = false;
	if (repostId !== undefined) {
		// Fetch repost to post
		repost = await Post.findOne({
			_id: repostId
		});

		if (repost == null) {
			return rej('repostee is not found');
		} else if (repost.repostId && !repost.text && !repost.mediaIds) {
			return rej('cannot repost to repost');
		}

		// Fetch recently post
		const latestPost = await Post.findOne({
			userId: user._id
		}, {
			sort: {
				_id: -1
			}
		});

		isQuote = text != null || files != null;

		// 直近と同じRepost対象かつ引用じゃなかったらエラー
		if (latestPost &&
			latestPost.repostId &&
			latestPost.repostId.equals(repost._id) &&
			!isQuote) {
			return rej('cannot repost same post that already reposted in your latest post');
		}

		// 直近がRepost対象かつ引用じゃなかったらエラー
		if (latestPost &&
			latestPost._id.equals(repost._id) &&
			!isQuote) {
			return rej('cannot repost your latest post');
		}
	}

	// Get 'replyId' parameter
	const [replyId, replyIdErr] = $(params.replyId).optional.id().$;
	if (replyIdErr) return rej('invalid replyId');

	let reply: IPost = null;
	if (replyId !== undefined) {
		// Fetch reply
		reply = await Post.findOne({
			_id: replyId
		});

		if (reply === null) {
			return rej('in reply to post is not found');
		}

		// 返信対象が引用でないRepostだったらエラー
		if (reply.repostId && !reply.text && !reply.mediaIds) {
			return rej('cannot reply to repost');
		}
	}

	// Get 'channelId' parameter
	const [channelId, channelIdErr] = $(params.channelId).optional.id().$;
	if (channelIdErr) return rej('invalid channelId');

	let channel: IChannel = null;
	if (channelId !== undefined) {
		// Fetch channel
		channel = await Channel.findOne({
			_id: channelId
		});

		if (channel === null) {
			return rej('channel not found');
		}

		// 返信対象の投稿がこのチャンネルじゃなかったらダメ
		if (reply && !channelId.equals(reply.channelId)) {
			return rej('チャンネル内部からチャンネル外部の投稿に返信することはできません');
		}

		// Repost対象の投稿がこのチャンネルじゃなかったらダメ
		if (repost && !channelId.equals(repost.channelId)) {
			return rej('チャンネル内部からチャンネル外部の投稿をRepostすることはできません');
		}

		// 引用ではないRepostはダメ
		if (repost && !isQuote) {
			return rej('チャンネル内部では引用ではないRepostをすることはできません');
		}
	} else {
		// 返信対象の投稿がチャンネルへの投稿だったらダメ
		if (reply && reply.channelId != null) {
			return rej('チャンネル外部からチャンネル内部の投稿に返信することはできません');
		}

		// Repost対象の投稿がチャンネルへの投稿だったらダメ
		if (repost && repost.channelId != null) {
			return rej('チャンネル外部からチャンネル内部の投稿をRepostすることはできません');
		}
	}

	// Get 'poll' parameter
	const [poll, pollErr] = $(params.poll).optional.strict.object()
		.have('choices', $().array('string')
			.unique()
			.range(2, 10)
			.each(c => c.length > 0 && c.length < 50))
		.$;
	if (pollErr) return rej('invalid poll');

	if (poll) {
		(poll as any).choices = (poll as any).choices.map((choice, i) => ({
			id: i, // IDを付与
			text: choice.trim(),
			votes: 0
		}));
	}

	// テキストが無いかつ添付ファイルが無いかつRepostも無いかつ投票も無かったらエラー
	if (text === undefined && files === null && repost === null && poll === undefined) {
		return rej('text, mediaIds, repostId or poll is required');
	}

	// 直近の投稿と重複してたらエラー
	// TODO: 直近の投稿が一日前くらいなら重複とは見なさない
	if (user.latestPost) {
		if (deepEqual({
			text: user.latestPost.text,
			reply: user.latestPost.replyId ? user.latestPost.replyId.toString() : null,
			repost: user.latestPost.repostId ? user.latestPost.repostId.toString() : null,
			mediaIds: (user.latestPost.mediaIds || []).map(id => id.toString())
		}, {
			text: text,
			reply: reply ? reply._id.toString() : null,
			repost: repost ? repost._id.toString() : null,
			mediaIds: (files || []).map(file => file._id.toString())
		})) {
			return rej('duplicate');
		}
	}

	let tokens = null;
	if (text) {
		// Analyze
		tokens = parse(text);

		// Extract hashtags
		const hashtags = tokens
			.filter(t => t.type == 'hashtag')
			.map(t => t.hashtag);

		hashtags.forEach(tag => {
			if (tags.indexOf(tag) == -1) {
				tags.push(tag);
			}
		});
	}

	// 投稿を作成
	const post = await Post.insert({
		createdAt: new Date(),
		channelId: channel ? channel._id : undefined,
		index: channel ? channel.index + 1 : undefined,
		mediaIds: files ? files.map(file => file._id) : [],
		replyId: reply ? reply._id : undefined,
		repostId: repost ? repost._id : undefined,
		poll: poll,
		text: text,
		textHtml: tokens === null ? null : html(tokens),
		cw: cw,
		tags: tags,
		userId: user._id,
		appId: app ? app._id : null,
		viaMobile: viaMobile,
		geo,

		// 以下非正規化データ
		_reply: reply ? { userId: reply.userId } : undefined,
		_repost: repost ? { userId: repost.userId } : undefined,
	});

	// Serialize
	const postObj = await pack(post);

	// Reponse
	res({
		createdPost: postObj
	});

	//#region Post processes

	User.update({ _id: user._id }, {
		$set: {
			latestPost: post
		}
	});

	const mentions = [];

	async function addMention(mentionee, reason) {
		// Reject if already added
		if (mentions.some(x => x.equals(mentionee))) return;

		// Add mention
		mentions.push(mentionee);

		// Publish event
		if (!user._id.equals(mentionee)) {
			const mentioneeMutes = await Mute.find({
				muterId: mentionee,
				deletedAt: { $exists: false }
			});
			const mentioneesMutedUserIds = mentioneeMutes.map(m => m.muteeId.toString());
			if (mentioneesMutedUserIds.indexOf(user._id.toString()) == -1) {
				event(mentionee, reason, postObj);
				pushSw(mentionee, reason, postObj);
			}
		}
	}

	// タイムラインへの投稿
	if (!channel) {
		// Publish event to myself's stream
		event(user._id, 'post', postObj);

		// Fetch all followers
		const followers = await Following
			.find({
				followeeId: user._id,
				// 削除されたドキュメントは除く
				deletedAt: { $exists: false }
			}, {
				followerId: true,
				_id: false
			});

		// Publish event to followers stream
		followers.forEach(following =>
			event(following.followerId, 'post', postObj));
	}

	// チャンネルへの投稿
	if (channel) {
		// Increment channel index(posts count)
		Channel.update({ _id: channel._id }, {
			$inc: {
				index: 1
			}
		});

		// Publish event to channel
		publishChannelStream(channel._id, 'post', postObj);

		// Get channel watchers
		const watches = await ChannelWatching.find({
			channelId: channel._id,
			// 削除されたドキュメントは除く
			deletedAt: { $exists: false }
		});

		// チャンネルの視聴者(のタイムライン)に配信
		watches.forEach(w => {
			event(w.userId, 'post', postObj);
		});
	}

	// Increment my posts count
	User.update({ _id: user._id }, {
		$inc: {
			postsCount: 1
		}
	});

	// If has in reply to post
	if (reply) {
		// Increment replies count
		Post.update({ _id: reply._id }, {
			$inc: {
				repliesCount: 1
			}
		});

		// 自分自身へのリプライでない限りは通知を作成
		notify(reply.userId, user._id, 'reply', {
			postId: post._id
		});

		// Fetch watchers
		Watching
			.find({
				postId: reply._id,
				userId: { $ne: user._id },
				// 削除されたドキュメントは除く
				deletedAt: { $exists: false }
			}, {
				fields: {
					userId: true
				}
			})
			.then(watchers => {
				watchers.forEach(watcher => {
					notify(watcher.userId, user._id, 'reply', {
						postId: post._id
					});
				});
			});

		// この投稿をWatchする
		if (user.account.settings.autoWatch !== false) {
			watch(user._id, reply);
		}

		// Add mention
		addMention(reply.userId, 'reply');
	}

	// If it is repost
	if (repost) {
		// Notify
		const type = text ? 'quote' : 'repost';
		notify(repost.userId, user._id, type, {
			postId: post._id
		});

		// Fetch watchers
		Watching
			.find({
				postId: repost._id,
				userId: { $ne: user._id },
				// 削除されたドキュメントは除く
				deletedAt: { $exists: false }
			}, {
				fields: {
					userId: true
				}
			})
			.then(watchers => {
				watchers.forEach(watcher => {
					notify(watcher.userId, user._id, type, {
						postId: post._id
					});
				});
			});

		// この投稿をWatchする
		// TODO: ユーザーが「Repostしたときに自動でWatchする」設定を
		//       オフにしていた場合はしない
		watch(user._id, repost);

		// If it is quote repost
		if (text) {
			// Add mention
			addMention(repost.userId, 'quote');
		} else {
			// Publish event
			if (!user._id.equals(repost.userId)) {
				event(repost.userId, 'repost', postObj);
			}
		}

		// 今までで同じ投稿をRepostしているか
		const existRepost = await Post.findOne({
			userId: user._id,
			repostId: repost._id,
			_id: {
				$ne: post._id
			}
		});

		if (!existRepost) {
			// Update repostee status
			Post.update({ _id: repost._id }, {
				$inc: {
					repostCount: 1
				}
			});
		}
	}

	// If has text content
	if (text) {
		/*
				// Extract a hashtags
				const hashtags = tokens
					.filter(t => t.type == 'hashtag')
					.map(t => t.hashtag)
					// Drop dupulicates
					.filter((v, i, s) => s.indexOf(v) == i);

				// ハッシュタグをデータベースに登録
				registerHashtags(user, hashtags);
		*/
		// Extract an '@' mentions
		const atMentions = tokens
			.filter(t => t.type == 'mention')
			.map(getAcct)
			// Drop dupulicates
			.filter((v, i, s) => s.indexOf(v) == i);

		// Resolve all mentions
		await Promise.all(atMentions.map(async (mention) => {
			// Fetch mentioned user
			// SELECT _id
			const mentionee = await User
				.findOne(parseAcct(mention), { _id: true });

			// When mentioned user not found
			if (mentionee == null) return;

			// 既に言及されたユーザーに対する返信や引用repostの場合も無視
			if (reply && reply.userId.equals(mentionee._id)) return;
			if (repost && repost.userId.equals(mentionee._id)) return;

			// Add mention
			addMention(mentionee._id, 'mention');

			// Create notification
			notify(mentionee._id, user._id, 'mention', {
				postId: post._id
			});

			return;
		}));
	}

	// Register to search database
	if (text && config.elasticsearch.enable) {
		const es = require('../../../db/elasticsearch');

		es.index({
			index: 'misskey',
			type: 'post',
			id: post._id.toString(),
			body: {
				text: post.text
			}
		});
	}

	// Append mentions data
	if (mentions.length > 0) {
		Post.update({ _id: post._id }, {
			$set: {
				mentions: mentions
			}
		});
	}

	//#endregion
});
