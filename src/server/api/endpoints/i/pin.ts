/**
 * Module dependencies
 */
import $ from 'cafy';
import User from '../../../../models/user';
import Note from '../../../../models/note';
import { pack } from '../../../../models/user';

/**
 * Pin note
 *
 * @param {any} params
 * @param {any} user
 * @return {Promise<any>}
 */
module.exports = async (params, user) => new Promise(async (res, rej) => {
	// Get 'noteId' parameter
	const [noteId, noteIdErr] = $(params.noteId).id().$;
	if (noteIdErr) return rej('invalid noteId param');

	// Fetch pinee
	const note = await Note.findOne({
		_id: noteId,
		userId: user._id
	});

	if (note === null) {
		return rej('note not found');
	}

	await User.update(user._id, {
		$set: {
			pinnedNoteId: note._id
		}
	});

	// Serialize
	const iObj = await pack(user, user, {
		detail: true
	});

	// Send response
	res(iObj);
});
