var r = document.querySelector('*')
r.style.setProperty("--registration", "0")

const loginForm = $("#login-form")[0]
const registrForm = $("#registr-form")[0]

registrForm.inert = true

$("#switch-to-login").on("click", () => {
    r.style.setProperty("--registration", "0")
    loginForm.inert = false
    registrForm.inert = true
})

$("#switch-to-registration").on("click", () => {
    r.style.setProperty("--registration", "-1")
    loginForm.inert = true
    registrForm.inert = false
})

$("#login-btn").on("click", () => {login()})
$("#registration-btn").on("click", () => {registration()})

function login(){
    $.post(".", {
        isLogin: true,
        login: $("#log-login").val(),
        password: $("#log-pass").val()
    },(data) => {
        data = JSON.parse(data)
        if(data["error"]){
            alert(data["error"])
        } else {
            document.location.reload()
        }
    })
}

function registration(){
    $.post(".", {
        isRegister: true,
        login: $("#reg-login").val(),
        password: $("#reg-pass").val()
    },(data) => {
        data = JSON.parse(data)
        if(data["error"]){
            alert(data["error"])
        } else {
            document.location.reload()
        }
    })
}

document.addEventListener('keydown', (e) => {
    if(e.code == "Enter"){
        if(!registrForm.inert) {
            registration()
        } else {
            login()
        }
    }
});

