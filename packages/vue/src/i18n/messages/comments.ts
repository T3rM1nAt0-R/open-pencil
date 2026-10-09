import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const commentMessageDefaults = {
  comment: 'Comment',
  comments: 'Comments',
  addComment: 'Add a comment',
  reply: 'Reply',
  post: 'Post',
  send: 'Send',
  someone: 'Someone',
  resolve: 'Resolve',
  reopen: 'Reopen',
  resolved: 'Resolved',
  open: 'Open',
  delete: 'Delete',
  deleteComment: 'Delete comment?',
  deleteCommentDescription: 'This removes the comment and all of its replies for everyone.',
  deleteReply: 'Delete reply',
  copyText: 'Copy text',
  goToComment: 'Go to comment',
  moreActions: 'More actions',
  searchComments: 'Search comments',
  filterAndSort: 'Filter and sort',
  thisPage: 'This page',
  allPages: 'All pages',
  onlyMine: 'Only my comments',
  newestFirst: 'Newest first',
  oldestFirst: 'Oldest first',
  emptyOpen: 'No open comments. Use the Comment tool, then click the canvas.',
  emptyResolved: 'No resolved comments.',
  noMatches: 'No comments match.',
  replyCount: params('Replies: {count}'),
  onLayer: params('On {name}'),
  commentDeleted: 'Comment deleted'
} as const

export const commentMessages = i18n('comments', commentMessageDefaults)
