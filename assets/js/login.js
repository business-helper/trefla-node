$(function() {
  console.log('[pageLoaded]');

  $('#login-form').on('submit', function(e) {
    e.preventDefault();
    const email_username = $('#email').val();
    const password = $('#password').val();

    myBasicRequest('/api/v1/auth/login', 'post', { email_username, password })
      .then(result => {
        console.log('[success]', result);
        toastr.success('Login succeeded!');
        saveLogin(result.token, result.data);
        setTimeout(() => {
          window.location.href = '/page/home';
        }, 2000);
      })
      .fail(error => {
        console.log('[error]', error, error.responseJSON);
        const { response } = error;
        removeLogin();
        toastr.error(response.message);
      });
  });
});