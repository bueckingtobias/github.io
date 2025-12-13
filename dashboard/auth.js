(function(){
  const KEY = "dashboard_auth_session";

  window.Auth = {
    login,
    logout,
    isAuthed,
    requireAuth,
    redirectToNextOr
  };

  function login(password){
    // 🔒 HIER dein Passwort festlegen
    const MASTER_PASSWORD = "dashboard2025";

    if(password === MASTER_PASSWORD){
      const token = {
        ok: true,
        ts: Date.now()
      };
      localStorage.setItem(KEY, JSON.stringify(token));
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
      const data = JSON.parse(raw);
      return data && data.ok === true;
    }catch(e){
      return false;
    }
  }

  function requireAuth(opts){
    const o = opts || {};
    if(!isAuthed()){
      const next = encodeURIComponent(location.pathname.split("/").pop());
      location.href = (o.loginUrl || "./login.html") + "?next=" + next;
    }
  }

  function redirectToNextOr(fallback){
    const p = new URLSearchParams(location.search);
    const next = p.get("next");
    location.href = next ? "./" + next : (fallback || "./view-home.html");
  }
})();