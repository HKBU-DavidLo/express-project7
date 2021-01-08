document.getElementById("backButton").addEventListener("click", goBack);

function goBack() {
    console.log("goback is called")
    window.history.back();
}