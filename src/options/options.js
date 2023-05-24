function saveOptions(e) {
    e.preventDefault();
    browser.storage.sync.set({
      logging: document.querySelector("#logging").checked
    });
  }

  function restoreOptions() {
    function setCurrentChoice(result) {
      document.querySelector("#logging").checked = result.logging || off;
    }

    function onError(error) {
      console.log(`Error: ${error}`);
    }

    let getting = browser.storage.sync.get("logging");
    getting.then(setCurrentChoice, onError);
  }

  document.addEventListener("DOMContentLoaded", restoreOptions);
  document.querySelector("form").addEventListener("submit", saveOptions);
