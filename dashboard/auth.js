(function(){
  const KEY = "dashboard_auth";

  window.Auth = {
    login(pw){
      if(pw === "dashboard2025"){
        localStorage.setItem(KEY, "1");
        return true;
      }
      return false;
    },
    logout(){
      localStorage.removeItem(KEY);
    },
    isAuthed(){
      return localStorage.getItem(KEY) === "1";
    }
  };
})();