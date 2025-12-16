(function(){
  const KEY = "dashboard_auth_session_v1";

  window.Auth = {
    login,
    logout,
    isAuthed,
    requireAuth,
    redirectToNextOr
  };

  function login(password){
    const MASTER_PASSWORD = "@bashboard";
    if(String(password || "") === MASTER_PASSWORD){
      localStorage.setItem(KEY, JSON.stringify({ ok:true, ts: Date.now() }));
      return true;
    }
    return false;
  }

  function logout(){
    localStorage.removeItem(KEY);
  }

  function isAuthed(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return false;
      const obj = JSON.parse(raw);
      return !!(obj && obj.ok === true);
    }catch(_){
      return false;
    }
  }

  function requireAuth(opts){
    const o = opts || {};
    const loginUrl = o.loginUrl || "./login.html";

    if(!isAuthed()){
      const next = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
      location.replace(loginUrl + "?next=" + next);
      return false;
    }
    return true;
  }

  function redirectToNextOr(fallback){
    try{
      const p = new URLSearchParams(location.search);
      const next = p.get("next");
      if(next){
        location.replace(next.startsWith("./") || next.startsWith("/") ? next : "./" + next);
      }else{
        location.replace(fallback || "./view-home.html");
      }
    }catch(_){
      location.replace(fallback || "./view-home.html");
    }
  }
})();