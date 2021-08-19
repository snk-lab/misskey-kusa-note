import $ from 'cafy';
import { ID } from '@/misc/cafy-id.js';
import define from '../../../define.js';
import { Ads } from '@/models/index.js';
import { makePaginationQuery } from '../../../common/make-pagination-query.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true as const,
	requireModerator: true,

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		sinceId: {
			validator: $.optional.type(ID),
		},

		untilId: {
			validator: $.optional.type(ID),
		},
	},
};

export default define(meta, async (ps) => {
	const query = makePaginationQuery(Ads.createQueryBuilder('ad'), ps.sinceId, ps.untilId)
		.andWhere('ad.expiresAt > :now', { now: new Date() });

	const ads = await query.take(ps.limit!).getMany();

	return ads;
});
