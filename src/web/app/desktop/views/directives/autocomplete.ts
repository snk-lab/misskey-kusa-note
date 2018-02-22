import * as getCaretCoordinates from 'textarea-caret';
import MkAutocomplete from '../components/autocomplete.vue';

export default {
	bind(el, binding, vn) {
		const self = el._autoCompleteDirective_ = {} as any;
		self.x = new Autocomplete(el);
		self.x.attach();
	},

	unbind(el, binding, vn) {
		const self = el._autoCompleteDirective_;
		self.x.detach();
	}
};

/**
 * オートコンプリートを管理するクラス。
 */
class Autocomplete {
	private suggestion: any;
	private textarea: any;

	/**
	 * 対象のテキストエリアを与えてインスタンスを初期化します。
	 */
	constructor(textarea) {
		// BIND ---------------------------------
		this.onInput =  this.onInput.bind(this);
		this.complete = this.complete.bind(this);
		this.close =    this.close.bind(this);
		// --------------------------------------

		this.suggestion = null;
		this.textarea = textarea;
	}

	/**
	 * このインスタンスにあるテキストエリアの入力のキャプチャを開始します。
	 */
	public attach() {
		this.textarea.addEventListener('input', this.onInput);
	}

	/**
	 * このインスタンスにあるテキストエリアの入力のキャプチャを解除します。
	 */
	public detach() {
		this.textarea.removeEventListener('input', this.onInput);
		this.close();
	}

	/**
	 * テキスト入力時
	 */
	private onInput() {
		this.close();

		const caret = this.textarea.selectionStart;
		const text = this.textarea.value.substr(0, caret);

		const mentionIndex = text.lastIndexOf('@');

		if (mentionIndex == -1) return;

		const username = text.substr(mentionIndex + 1);

		if (!username.match(/^[a-zA-Z0-9-]+$/)) return;

		this.open('user', username);
	}

	/**
	 * サジェストを提示します。
	 */
	private open(type, q) {
		// 既に開いているサジェストは閉じる
		this.close();

		// サジェスト要素作成
		this.suggestion = new MkAutocomplete({
			propsData: {
				textarea: this.textarea,
				complete: this.complete,
				close: this.close,
				type: type,
				q: q
			}
		}).$mount();

		// ~ サジェストを表示すべき位置を計算 ~

		const caretPosition = getCaretCoordinates(this.textarea, this.textarea.selectionStart);

		const rect = this.textarea.getBoundingClientRect();

		const x = rect.left + window.pageXOffset + caretPosition.left;
		const y = rect.top + window.pageYOffset + caretPosition.top;

		this.suggestion.$el.style.left = x + 'px';
		this.suggestion.$el.style.top = y + 'px';

		// 要素追加
		document.body.appendChild(this.suggestion.$el);
	}

	/**
	 * サジェストを閉じます。
	 */
	private close() {
		if (this.suggestion == null) return;

		this.suggestion.$destroy();
		this.suggestion = null;

		this.textarea.focus();
	}

	/**
	 * オートコンプリートする
	 */
	private complete(user) {
		this.close();

		const value = user.username;

		const caret = this.textarea.selectionStart;
		const source = this.textarea.value;

		const before = source.substr(0, caret);
		const trimmedBefore = before.substring(0, before.lastIndexOf('@'));
		const after = source.substr(caret);

		// 結果を挿入する
		this.textarea.value = trimmedBefore + '@' + value + ' ' + after;

		// キャレットを戻す
		this.textarea.focus();
		const pos = caret + value.length;
		this.textarea.setSelectionRange(pos, pos);
	}
}
