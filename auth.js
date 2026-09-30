import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ========================================================================
// CONFIGURAÇÃO DO FIREBASE
// ========================================================================

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
const db = getFirestore(app);


// ========================================================================
// CONTROLE DA TELA
// ========================================================================

let modoLogin = false;


// ========================================================================
// ALTERNAR ENTRE CADASTRO E LOGIN
// ========================================================================

window.alternarTela = function() {

    modoLogin = !modoLogin;

    const titulo = document.querySelector("#auth-form h2");
    const campoNome = document.getElementById("reg-username");
    const botao = document.querySelector(".auth-box button");

    // Agora pegamos especificamente o parágrafo
    // que controla a troca entre Login e Cadastro
    const link = document.getElementById("alternar-login");

    // Link "Esqueci minha senha"
    const linkEsqueci = document.getElementById("esqueci-senha");


    if (modoLogin) {

        // ================================================================
        // TELA DE LOGIN
        // ================================================================

        titulo.innerText = "Entrar no Clube";

        campoNome.style.display = "none";

        botao.innerText = "Entrar";

        // Mostra "Esqueci minha senha"
        linkEsqueci.style.display = "block";

        link.innerHTML =
            'Não tem conta? <a href="#" onclick="alternarTela()">Criar Conta</a>';

    } else {

        // ================================================================
        // TELA DE CADASTRO
        // ================================================================

        titulo.innerText = "Criar Conta";

        campoNome.style.display = "block";

        botao.innerText = "Cadastrar e Entrar";

        // Esconde "Esqueci minha senha"
        linkEsqueci.style.display = "none";

        link.innerHTML =
            'Já tem conta? <a href="#" onclick="alternarTela()">Fazer Login</a>';
    }
};


// ========================================================================
// CADASTRO / LOGIN
// ========================================================================

window.cadastrar = async function() {

    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const username = document.getElementById("reg-username").value;

    const botao = document.querySelector(".auth-box button");


    try {

        if (modoLogin) {

            // ============================================================
            // LOGIN
            // ============================================================

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            // Atualiza o nome no Firestore.
            // A gravação acontece sem bloquear a entrada no site.

            setDoc(
                doc(db, "usuarios", user.uid),
                {
                    usuario: user.displayName || "Membro"
                },
                {
                    merge: true
                }
            ).catch((error) => {

                console.error(
                    "Erro ao atualizar nome no Firestore:",
                    error
                );

            });


        } else {

            // ============================================================
            // CADASTRO
            // ============================================================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            // Salva o nome no Firebase Authentication

            await updateProfile(
                userCredential.user,
                {
                    displayName: username
                }
            );


            // Salva também o nome no Firestore

            await setDoc(
                doc(
                    db,
                    "usuarios",
                    userCredential.user.uid
                ),
                {
                    usuario: username
                },
                {
                    merge: true
                }
            );
        }


        // ================================================================
        // VAI PARA A PÁGINA PRINCIPAL
        // ================================================================

        window.location.href = "index.html";


    } catch (error) {

        console.error("Erro:", error);

        alert("Erro: " + error.message);

        if (botao) {
            botao.disabled = false;
        }
    }
};


// ========================================================================
// RECUPERAÇÃO DE SENHA
// ========================================================================

window.mostrarRecuperacao = async function() {

    const campoEmail = document.getElementById("reg-email");

    const email = campoEmail.value.trim();


    // Verifica se o usuário colocou um e-mail

    if (!email) {

        alert("Digite seu e-mail primeiro.");

        campoEmail.focus();

        return;
    }


    try {

        // Define o idioma do e-mail como português

        auth.languageCode = "pt-BR";


        // Envia o e-mail de redefinição de senha

        await sendPasswordResetEmail(
            auth,
            email
        );


        alert(
            "E-mail de recuperação de senha enviado! 📧\n\n" +
            "Verifique sua caixa de entrada e também a pasta de spam."
        );


    } catch (error) {

        console.error(
            "Erro ao enviar recuperação de senha:",
            error
        );


        alert(
            "Não foi possível enviar o e-mail de recuperação.\n\n" +
            "Verifique se o e-mail está correto."
        );
    }
};