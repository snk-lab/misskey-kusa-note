import * as mongo from 'mongodb';
import * as Router from 'koa-router';
const json = require('koa-json-body');
const httpSignature = require('http-signature');

import { createHttpJob } from '../queue';
import pack from '../remote/activitypub/renderer';
import Note from '../models/note';
import User, { isLocalUser, ILocalUser, IUser } from '../models/user';
import renderNote from '../remote/activitypub/renderer/note';
import renderKey from '../remote/activitypub/renderer/key';
import renderPerson from '../remote/activitypub/renderer/person';
import Outbox, { packActivity } from './activitypub/outbox';
import Followers from './activitypub/followers';
import Following from './activitypub/following';
import Featured from './activitypub/featured';

// Init router
const router = new Router();

//#region Routing

function inbox(ctx: Router.IRouterContext) {
	let signature;

	ctx.req.headers.authorization = `Signature ${ctx.req.headers.signature}`;

	try {
		signature = httpSignature.parseRequest(ctx.req, { 'headers': [] });
	} catch (e) {
		ctx.status = 401;
		return;
	}

	createHttpJob({
		type: 'processInbox',
		activity: ctx.request.body,
		signature
	});

	ctx.status = 202;
}

function isActivityPubReq(ctx: Router.IRouterContext) {
	ctx.response.vary('Accept');
	const accepted = ctx.accepts('html', 'application/activity+json', 'application/ld+json');
	return ['application/activity+json', 'application/ld+json'].includes(accepted as string);
}

export function setResponseType(ctx: Router.IRouterContext) {
	const accpet = ctx.accepts('application/activity+json', 'application/ld+json');
	if (accpet === 'application/ld+json') {
		ctx.response.type = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';
	} else {
		ctx.response.type = 'application/activity+json; charset=utf-8';
	}
}

// inbox
router.post('/inbox', json(), inbox);
router.post('/users/:user/inbox', json(), inbox);

// note
router.get('/notes/:note', async (ctx, next) => {
	if (!isActivityPubReq(ctx)) return await next();

	const note = await Note.findOne({
		_id: new mongo.ObjectID(ctx.params.note),
		$or: [ { visibility: 'public' }, { visibility: 'home' } ]
	});

	if (note === null) {
		ctx.status = 404;
		return;
	}

	ctx.body = pack(await renderNote(note, false));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

// note activity
router.get('/notes/:note/activity', async ctx => {
	const note = await Note.findOne({
		_id: new mongo.ObjectID(ctx.params.note),
		visibility: { $in: ['public', 'home'] }
	});

	if (note === null) {
		ctx.status = 404;
		return;
	}

	ctx.body = pack(await packActivity(note));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

// outbox
router.get('/users/:user/outbox', Outbox);

// followers
router.get('/users/:user/followers', Followers);

// following
router.get('/users/:user/following', Following);

// featured
router.get('/users/:user/collections/featured', Featured);

// publickey
router.get('/users/:user/publickey', async ctx => {
	const userId = new mongo.ObjectID(ctx.params.user);

	const user = await User.findOne({
		_id: userId,
		host: null
	});

	if (user === null) {
		ctx.status = 404;
		return;
	}

	if (isLocalUser(user)) {
		ctx.body = pack(renderKey(user));
		ctx.set('Cache-Control', 'public, max-age=180');
		setResponseType(ctx);
	} else {
		ctx.status = 400;
	}
});

// user
async function userInfo(ctx: Router.IRouterContext, user: IUser) {
	if (user === null) {
		ctx.status = 404;
		return;
	}

	ctx.body = pack(await renderPerson(user as ILocalUser));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
}

router.get('/users/:user', async ctx => {
	const userId = new mongo.ObjectID(ctx.params.user);

	const user = await User.findOne({
		_id: userId,
		host: null
	});

	await userInfo(ctx, user);
});

router.get('/@:user', async (ctx, next) => {
	if (!isActivityPubReq(ctx)) return await next();

	const user = await User.findOne({
		usernameLower: ctx.params.user.toLowerCase(),
		host: null
	});

	await userInfo(ctx, user);
});
//#endregion

export default router;
