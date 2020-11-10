const TOKEN_KEY = "LIVETREFLACHAT3456TOKEN";
const PROFILE_KEY = "LIVETREFLACHAT3456PROFILE";

function myBasicRequest(url, type, payload) {
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

function myBearerRequest(url, type, payload = "") {
  return $.ajax({
    url: url,
    method: type,
    data: JSON.stringify(payload) || "",
    contentType: "application/json; charset=utf-8",
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', `Bearer ${loadToken()}`)
    },
    dataType: "json",
  });
}

function saveLogin(token, profile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function removeLogin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

function loadProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY));
}

function checkAuthentication() {
  setInterval(() => {
    const token = loadToken();
    if (!token) {
      window.location.href = '/page/login';
    }
  }, 5000);
}

function string2Time(str) {
  const arr1 = str.split(':');
  const arr2 = str.split('-');

  const stdStr = `${arr2[0]}-${arr2[1]}-${arr2[2]} ${arr2[3]}:${arr2[4]}:${arr2[5]}`;
  let d = new Date(stdStr);
  d.setTime(d.getTime() - arr1[1] * 60 * 1000 + d.getTimezoneOffset() * 60 * 1000);
  return d;
}
