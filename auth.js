import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVqYSFgmI1MZ5wRWCD8r6SyerQ6cQ5WEQ",
    authDomain: "clube-do-livro-ef9b2.firebaseapp.com",
    projectId: "clube-do-livro-ef9b2",
    storageBucket: "clube-do-livro-ef9b2.firebasestorage.app",
    messagingSenderId: "524095033581",
    appId: "1:524095033581:web:b13fa5b2bafe2904ce3ce4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let modoLogin = false; // Controla se estamos na tela de Cadastro ou Login

window.alternarTela = function() {
    modoLogin = !modoLogin;
    const titulo = document.querySelector("#auth-form h2");
    const campoNome = document.getElementById("reg-username");
    const botao = document.querySelector(".auth-box button");
    const link = document.querySelector("#auth-form p");

    if (modoLogin) {
        titulo.innerText = "Entrar no Clube";
        campoNome.style.display = "none"; // Esconde o nome no login
        botao.innerText = "Entrar";
        link.innerHTML = 'Não tem conta? <a href="#" onclick="alternarTela()">Criar Conta</a>';
    } else {
        titulo.innerText = "Criar Conta";
        campoNome.style.display = "block";
        botao.innerText = "Cadastrar e Entrar";
        link.innerHTML = 'Já tem conta? <a href="#" onclick="alternarTela()">Fazer Login</a>';
    }
}

window.cadastrar = async function() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value;

    try {
        if (modoLogin) {
            // Lógica de LOGIN
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            // Lógica de CADASTRO
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
        }
        window.location.href = "index.html";
    } catch (error) {
        alert("Erro: " + error.message);
    }
}