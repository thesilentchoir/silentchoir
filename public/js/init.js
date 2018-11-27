// Initializes the pages and loads in the reusable sections of the page, such as the header and navigation

$(() => {
  // $.ajax({ type: 'GET',
  //   url: 'sections/header.html',
  //   success: (text) => {
  //     $('head').prepend(`${text}`);
  //   }
  // });
  $('nav').load('sections/nav.html');
});
