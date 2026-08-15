const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");


loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;


    loginMessage.textContent = "Logging in...";
    loginMessage.className = "message";


    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });


    if (error) {

        loginMessage.textContent = error.message;
        loginMessage.className = "message error";

        return;
    }


    window.location.href = "dashboard.html";

});