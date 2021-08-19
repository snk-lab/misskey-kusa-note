import $ from 'cafy';
import { ID } from '@/misc/cafy-id.js';
import define from '../../../define.js';
import * as ms from 'ms';
import { ApiError } from '../../../error.js';
import { MessagingMessages } from '@/models/index.js';
import { deleteMessage } from '@/services/messages/delete.js';

export const meta = {
	tags: ['messaging'],

	requireCredential: true as const,

	kind: 'write:messaging',

	limit: {
		duration: ms('1hour'),
		max: 300,
		minInterval: ms('1sec')
	},

	params: {
		messageId: {
			validator: $.type(ID),
		}
	},

	errors: {
		noSuchMessage: {
			message: 'No such message.',
			code: 'NO_SUCH_MESSAGE',
			id: '54b5b326-7925-42cf-8019-130fda8b56af'
		},
	}
};

export default define(meta, async (ps, user) => {
	const message = await MessagingMessages.findOne({
		id: ps.messageId,
		userId: user.id
	});

	if (message == null) {
		throw new ApiError(meta.errors.noSuchMessage);
	}

	await deleteMessage(message);
});
