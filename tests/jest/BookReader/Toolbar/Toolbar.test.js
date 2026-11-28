import sinon from 'sinon';

import { createPopup, Toolbar } from '@/src/BookReader/Toolbar/Toolbar.js';

afterEach(() => {
  sinon.restore();
});

describe('Share dialog', () => {
  let $reader;
  let $share;
  let br;
  let originalUrl;

  beforeEach(() => {
    originalUrl = window.location.href;
    window.history.replaceState(null, '', '/books/example?mode=1up#page/n2');
    $reader = $('<div>').appendTo(document.body);
    $share = $('<div class="BRshare">').appendTo($reader);
    br = {
      $: selector => $reader.find(selector),
      bookTitle: 'Book & Guide',
      constMode1up: 1,
      constMode2up: 2,
      currentIndex: () => 2,
      book: { getPageNum: index => `n${index}` },
      getEmbedCode: sinon.stub().returns('<iframe></iframe>'),
    };
    new Toolbar(br).buildShareDiv($share);
    // Colorbox moves inline content outside the reader while the modal is open.
    $share.appendTo(document.body);
  });

  afterEach(() => {
    $share.remove();
    $reader.remove();
    window.history.replaceState(null, '', originalUrl);
  });

  test('renders one labeled button per social service and closes with Finished', () => {
    const close = sinon.stub($.colorbox, 'close');
    const $buttons = $share.find('.share-social button');

    expect($buttons.toArray().map(button => button.textContent.trim())).toEqual(['Facebook', 'X', 'Email']);
    expect($share.find('.share-social i')).toHaveLength(3);
    $share.find('.share-finished').trigger('click');
    expect(close.calledOnce).toBe(true);
  });

  test.each([
    ['Facebook', '.facebook-share-button', 'https://www.facebook.com/sharer.php', 'u'],
    ['X', '.x-share-button', 'https://twitter.com/intent/tweet', 'url'],
  ])('shares the book or current page on %s', (_name, selector, endpoint, urlParam) => {
    const open = sinon.stub(window, 'open');
    const $button = $share.find(selector);

    $button.trigger('click');
    expect(new URL(open.firstCall.args[0]).searchParams.get(urlParam))
      .toBe(`${window.location.origin}/books/example`);

    window.history.replaceState(null, '', '/books/example?mode=2up#page/n3');
    $share.find('.thispage-social').prop('checked', true);
    $button.trigger('click');
    const popupUrl = new URL(open.secondCall.args[0]);
    expect(popupUrl.origin + popupUrl.pathname).toBe(endpoint);
    expect(popupUrl.searchParams.get(urlParam)).toBe(window.location.href);
    if (urlParam === 'url') {
      expect(popupUrl.searchParams.get('text')).toBe(br.bookTitle);
    }
  });

  test('shares the book root when the URL plugin puts the page in the path', () => {
    br.options = { urlMode: 'history', urlHistoryBasePath: '/books/example/' };
    window.history.replaceState(null, '', '/books/example/page/n3');
    new Toolbar(br).buildShareDiv($share.empty());
    const open = sinon.stub(window, 'open');
    const $button = $share.find('.facebook-share-button');

    expect($share.find('.booklink').val()).toBe(`${window.location.origin}/books/example/`);
    $button.trigger('click');
    expect(new URL(open.firstCall.args[0]).searchParams.get('u'))
      .toBe(`${window.location.origin}/books/example/`);
    $share.find('.thispage-social').prop('checked', true);
    $button.trigger('click');
    expect(new URL(open.secondCall.args[0]).searchParams.get('u')).toBe(window.location.href);
  });

  test('provides book and page links and updates the embed code with the selected mode and page', () => {
    expect($share.find('.BRpageviewValue').val()).toBe(window.location.href);
    expect($share.find('.booklink').val()).toBe(window.location.href.split('#')[0]);
    expect(br.getEmbedCode.lastCall.args[2]).toEqual({ mode: '1' });

    $share.find('input[name=pages][value="2"]').prop('checked', true).trigger('change');
    $share.find('input[name=thispage]').prop('checked', true).trigger('change');

    expect(br.getEmbedCode.lastCall.args).toEqual(['480px', '430px', { mode: '2', page: 'n2' }]);
    expect($share.find('.BRframeEmbed').val()).toBe('<iframe></iframe>');
  });
});

describe('createPopup', () => {
  test('calls window.open', () => {
    const openStub = sinon.stub(window, 'open');
    createPopup('openlibrary.org', 100, 100, 'Open Library');
    expect(openStub.callCount).toBe(1);
  });

  test('opens in center', () => {
    const openStub = sinon.stub(window, 'open');
    createPopup('openlibrary.org', 100, 100, 'Open Library');
    // jest default window size is 1024x768
    expect(openStub.args[0]).toEqual([
      'openlibrary.org',
      'Open Library',
      'status=1,width=100,height=100,top=334,left=462',
    ]);
  });
});
