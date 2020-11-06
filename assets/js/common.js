const TOKEN_KEY = "TREFLACHAT3456TOKEN";
const PROFILE_KEY = "TREFLACHAT3456PROFILE";

function myRequest(url, type, payload) {
  return $.ajax({
    url: url,
    method: type,
    data: JSON.stringify(payload),
    contentType: "application/json; charset=utf-8",
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', 'Basic dHJlZmxhOmFwaTEyM1YxJCQh')
    },
    dataType: "json",
  });
}

function saveLogin(token, profile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, profile);
}

function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function removeLogin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

function loadProfile() {

}

function checkAuthentication() {
  setInterval(() => {
    const token = loadToken();
    if (!token) {
      window.location.href = '/page/login';
    }
  }, 5000);
}