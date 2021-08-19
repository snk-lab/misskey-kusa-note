import { EntityRepository, Repository } from 'typeorm';
import { Users } from '../index.js';
import { Blocking } from '../entities/blocking.js';
import { awaitAll } from '../../prelude/await-all.js';
import { SchemaType } from '@/misc/schema.js';
import { User } from '../entities/user.js';

export type PackedBlocking = SchemaType<typeof packedBlockingSchema>;

@EntityRepository(Blocking)
export class BlockingRepository extends Repository<Blocking> {
	public async pack(
		src: Blocking['id'] | Blocking,
		me?: { id: User['id'] } | null | undefined
	): Promise<PackedBlocking> {
		const blocking = typeof src === 'object' ? src : await this.findOneOrFail(src);

		return await awaitAll({
			id: blocking.id,
			createdAt: blocking.createdAt.toISOString(),
			blockeeId: blocking.blockeeId,
			blockee: Users.pack(blocking.blockeeId, me, {
				detail: true
			})
		});
	}

	public packMany(
		blockings: any[],
		me: { id: User['id'] }
	) {
		return Promise.all(blockings.map(x => this.pack(x, me)));
	}
}

export const packedBlockingSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'date-time',
		},
		blockeeId: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
		},
		blockee: {
			type: 'object' as const,
			optional: false as const, nullable: false as const,
			ref: 'User',
		},
	}
};
