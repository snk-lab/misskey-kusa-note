<template>
<XWindow ref="window"
	:initial-width="500"
	:initial-height="500"
	:can-resize="true"
	:close-button="false"
	:contextmenu="contextmenu"
	@closed="$emit('closed')"
>
	<template #header>
		<XHeader :info="pageInfo" :back-button="history.length > 0" @back="back()" :close-button="true" @close="close()" :title-only="true"/>
	</template>
	<div class="yrolvcoq _flat_">
		<component :is="component" v-bind="props" :ref="changePage"/>
	</div>
</XWindow>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XWindow from '@client/components/ui/window.vue';
import XHeader from '@client/ui/_common_/header.vue';
import { popout } from '@client/scripts/popout';
import copyToClipboard from '@client/scripts/copy-to-clipboard';
import { resolve } from '@client/router';
import { url } from '@client/config';
import * as symbols from '@client/symbols';

export default defineComponent({
	components: {
		XWindow,
		XHeader,
	},

	inject: {
		sideViewHook: {
			default: null
		}
	},

	provide() {
		return {
			navHook: (path) => {
				this.navigate(path);
			}
		};
	},

	props: {
		initialPath: {
			type: String,
			required: true,
		},
		initialComponent: {
			type: Object,
			required: true,
		},
		initialProps: {
			type: Object,
			required: false,
			default: () => {},
		},
	},

	emits: ['closed'],

	data() {
		return {
			pageInfo: null,
			path: this.initialPath,
			component: this.initialComponent,
			props: this.initialProps,
			history: [],
		};
	},

	computed: {
		url(): string {
			return url + this.path;
		},

		contextmenu() {
			return [{
				type: 'label',
				text: this.path,
			}, {
				icon: 'fas fa-expand-alt',
				text: this.$ts.showInPage,
				action: this.expand
			}, this.sideViewHook ? {
				icon: 'fas fa-columns',
				text: this.$ts.openInSideView,
				action: () => {
					this.sideViewHook(this.path);
					this.$refs.window.close();
				}
			} : undefined, {
				icon: 'fas fa-external-link-alt',
				text: this.$ts.popout,
				action: this.popout
			}, null, {
				icon: 'fas fa-external-link-alt',
				text: this.$ts.openInNewTab,
				action: () => {
					window.open(this.url, '_blank');
					this.$refs.window.close();
				}
			}, {
				icon: 'fas fa-link',
				text: this.$ts.copyLink,
				action: () => {
					copyToClipboard(this.url);
				}
			}];
		},
	},

	methods: {
		changePage(page) {
			if (page == null) return;
			if (page[symbols.PAGE_INFO]) {
				this.pageInfo = page[symbols.PAGE_INFO];
			}
		},

		navigate(path, record = true) {
			if (record) this.history.push(this.path);
			this.path = path;
			const { component, props } = resolve(path);
			this.component = component;
			this.props = props;
		},

		back() {
			this.navigate(this.history.pop(), false);
		},

		close() {
			this.$refs.window.close();
		},

		expand() {
			this.$router.push(this.path);
			this.$refs.window.close();
		},

		popout() {
			popout(this.path, this.$el);
			this.$refs.window.close();
		},
	},
});
</script>

<style lang="scss" scoped>
.yrolvcoq {
	min-height: 100%;
}
</style>
