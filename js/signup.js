const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("signup-message");


signupForm.addEventListener("submit", async function(event) {

    event.preventDefault();


    const firstname = document
        .getElementById("firstName")
        .value
        .trim();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;


    signupMessage.textContent = "Creating account...";
    signupMessage.className = "message";


    const {
        data,
        error
    } = await db.auth.signUp({
    
        email: email,
    
        password: password,
    
        options: {
    
            emailRedirectTo:
                "https://adithya-ariv.github.io/Annsborough-Park-PB-Tourny/dashboard.html",
    
            data: {
                firstname: firstname
            }
    
        }
    
    });


    if (error) {

        signupMessage.textContent = error.message;
        signupMessage.className = "message error";

        return;
    }


    /*
       If email confirmation is disabled,
       the user will immediately be logged in.
    */

    if (data.session) {

        window.location.href = "dashboard.html";

        return;
    }


    /*
       If email confirmation is enabled,
       tell the user to check their email.
    */

    signupMessage.textContent =
        "Account created! Check your email to confirm your account.";

    signupMessage.className = "message success";

});