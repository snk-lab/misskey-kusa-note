import { IDriveFile } from '../models/drive-file';
import config from '../config';

export default function(file: IDriveFile, thumbnail = false): string {
	if (file == null) return null;

	const isImage = file.contentType && file.contentType.startsWith('image/');

	if (file.metadata.withoutChunks) {
		if (thumbnail) {
			return file.metadata.thumbnailUrl || file.metadata.webpublicUrl || (isImage ? file.metadata.url : null);
		} else {
			return file.metadata.webpublicUrl || file.metadata.url;
		}
	} else {
		if (thumbnail) {
			return isImage ? `${config.drive_url}/${file._id}?thumbnail` : null;
		} else {
			return `${config.drive_url}/${file._id}?web`;
		}
	}
}

export function getOriginalUrl(file: IDriveFile) {
	if (file.metadata && file.metadata.url) {
		return file.metadata.url;
	}

	const accessKey = file.metadata ? file.metadata.accessKey : null;
	return `${config.drive_url}/${file._id}${accessKey ? '?original=' + accessKey : ''}`;
}
