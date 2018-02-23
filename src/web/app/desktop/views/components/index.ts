import Vue from 'vue';

import ui from './ui.vue';
import uiNotification from './ui-notification.vue';
import home from './home.vue';
import timeline from './timeline.vue';
import posts from './posts.vue';
import subPostContent from './sub-post-content.vue';
import window from './window.vue';
import postFormWindow from './post-form-window.vue';
import repostFormWindow from './repost-form-window.vue';
import analogClock from './analog-clock.vue';
import ellipsisIcon from './ellipsis-icon.vue';
import imagesImage from './images-image.vue';
import imagesImageDialog from './images-image-dialog.vue';
import notifications from './notifications.vue';
import postForm from './post-form.vue';
import repostForm from './repost-form.vue';
import followButton from './follow-button.vue';
import postPreview from './post-preview.vue';
import drive from './drive.vue';
import postDetail from './post-detail.vue';
import settings from './settings.vue';
import calendar from './calendar.vue';
import activity from './activity.vue';
import friendsMaker from './friends-maker.vue';
import followers from './followers.vue';
import following from './following.vue';
import usersList from './users-list.vue';
import widgetContainer from './widget-container.vue';

//#region widgets
import wNotifications from './widgets/notifications.vue';
import wTimemachine from './widgets/timemachine.vue';
import wActivity from './widgets/activity.vue';
import wTrends from './widgets/trends.vue';
import wUsers from './widgets/users.vue';
import wPolls from './widgets/polls.vue';
import wPostForm from './widgets/post-form.vue';
import wMessaging from './widgets/messaging.vue';
import wChannel from './widgets/channel.vue';
//#endregion

Vue.component('mk-ui', ui);
Vue.component('mk-ui-notification', uiNotification);
Vue.component('mk-home', home);
Vue.component('mk-timeline', timeline);
Vue.component('mk-posts', posts);
Vue.component('mk-sub-post-content', subPostContent);
Vue.component('mk-window', window);
Vue.component('mk-post-form-window', postFormWindow);
Vue.component('mk-repost-form-window', repostFormWindow);
Vue.component('mk-analog-clock', analogClock);
Vue.component('mk-ellipsis-icon', ellipsisIcon);
Vue.component('mk-images-image', imagesImage);
Vue.component('mk-images-image-dialog', imagesImageDialog);
Vue.component('mk-notifications', notifications);
Vue.component('mk-post-form', postForm);
Vue.component('mk-repost-form', repostForm);
Vue.component('mk-follow-button', followButton);
Vue.component('mk-post-preview', postPreview);
Vue.component('mk-drive', drive);
Vue.component('mk-post-detail', postDetail);
Vue.component('mk-settings', settings);
Vue.component('mk-calendar', calendar);
Vue.component('mk-activity', activity);
Vue.component('mk-friends-maker', friendsMaker);
Vue.component('mk-followers', followers);
Vue.component('mk-following', following);
Vue.component('mk-users-list', usersList);
Vue.component('mk-widget-container', widgetContainer);

//#region widgets
Vue.component('mkw-notifications', wNotifications);
Vue.component('mkw-timemachine', wTimemachine);
Vue.component('mkw-activity', wActivity);
Vue.component('mkw-trends', wTrends);
Vue.component('mkw-users', wUsers);
Vue.component('mkw-polls', wPolls);
Vue.component('mkw-post-form', wPostForm);
Vue.component('mkw-messaging', wMessaging);
Vue.component('mkw-channel', wChannel);
//#endregion
