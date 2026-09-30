import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


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
// 🔐 VERIFICAR USUÁRIO LOGADO
// ========================================================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // ================================================================
    // DADOS QUE JÁ ESTÃO DISPONÍVEIS NO FIREBASE AUTH
    // ================================================================

    const campoNome = document.getElementById("perfil-nome");
    const campoEmail = document.getElementById("perfil-email");

    if (campoNome) {
        campoNome.value = user.displayName || "";
    }

    if (campoEmail) {
        campoEmail.value = user.email || "";
    }


    // ================================================================
    // PREPARA O AVATAR IMEDIATAMENTE
    // ================================================================

    const avatarContainer = document.getElementById("perfil-avatar");

    if (avatarContainer) {

        avatarContainer.style.width = "120px";
        avatarContainer.style.height = "120px";
        avatarContainer.style.borderRadius = "50%";
        avatarContainer.style.display = "flex";
        avatarContainer.style.alignItems = "center";
        avatarContainer.style.justifyContent = "center";
        avatarContainer.style.margin = "0 auto";
        avatarContainer.style.background = "#ef5f81";
        avatarContainer.style.color = "white";
        avatarContainer.style.fontSize = "2.5rem";
        avatarContainer.style.fontWeight = "bold";
        avatarContainer.style.overflow = "hidden";
        avatarContainer.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

        // Mostra a inicial imediatamente.
        // Assim o usuário não fica olhando um espaço vazio
        // enquanto o Firebase busca a foto.
        avatarContainer.innerText =
            user.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : "?";


        // Busca a foto em segundo plano.
        carregarFotoPerfil(user);
    }


    // ================================================================
    // CONTADOR DE RESENHAS
    // ================================================================

    // Começa ao mesmo tempo que a busca da foto.
    carregarContadorResenhas(user.uid);
});


// ========================================================================
// 🖼️ CARREGAR FOTO DO PERFIL
// ========================================================================

async function carregarFotoPerfil(user) {

    const avatarContainer = document.getElementById("perfil-avatar");

    if (!avatarContainer) return;

    try {

        const docRef = doc(
            db,
            "usuarios",
            user.uid
        );

        const docSnap = await getDoc(docRef);

        if (
            docSnap.exists() &&
            docSnap.data().foto
        ) {

            avatarContainer.innerHTML = `
                <img
                    src="${docSnap.data().foto}"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        display:block;
                        border-radius:50%;
                    "
                >
            `;
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar foto do banco:",
            erro
        );

        // Se der erro, a inicial que já colocamos continua aparecendo.
    }
}


// ========================================================================
// 📷 TRANSFORMAR FOTO EM TEXTO
// ========================================================================

function transformarEmTexto(arquivo) {

    return new Promise((resolve, reject) => {

        const leitor = new FileReader();

        leitor.readAsDataURL(arquivo);

        leitor.onload = () => resolve(leitor.result);

        leitor.onerror = (error) => reject(error);
    });
}


// ========================================================================
// 💾 SALVAR ALTERAÇÕES
// ========================================================================

window.salvarAlteracoes = async function() {

    const user = auth.currentUser;

    const novoNome =
        document.getElementById("perfil-nome").value;

    const arquivoFoto =
        document.getElementById("perfil-foto-arquivo").files[0];


    if (!user) return;


    if (!novoNome.trim()) {

        mostrarToast(
            "O nome não pode ficar vazio! ",
            "erro"
        );

        return;
    }


    try {

        if (arquivoFoto) {

            // Se o usuário selecionou uma nova foto,
            // converte e salva.

            const fotoTexto =
                await transformarEmTexto(arquivoFoto);


            await setDoc(
                doc(db, "usuarios", user.uid),
                {
                    foto: fotoTexto,
                    nome: novoNome,
                    email: user.email
                },
                {
                    merge: true
                }
            );

        } else {

            // Se não selecionou foto,
            // mantém a foto antiga.

            await setDoc(
                doc(db, "usuarios", user.uid),
                {
                    nome: novoNome
                },
                {
                    merge: true
                }
            );
        }


        // Atualiza o nome no Firebase Authentication.

        await updateProfile(
            user,
            {
                displayName: novoNome
            }
        );


        mostrarToast(
            "Perfil atualizado! ✨",
            "sucesso"
        );


        // Atualiza a tela após 1.5 segundos
        // para aplicar as mudanças.

        setTimeout(() => {
            location.reload();
        }, 1500);


    } catch (e) {

        console.error(e);

        mostrarToast(
            "Erro ao salvar: " + e.message,
            "erro"
        );
    }
};




// ========================================================================
// 🚪 SAIR
// ========================================================================

window.sair = () => {

    signOut(auth)
        .then(() => {
            window.location.href = "login.html";
        });
};


// ========================================================================
// ✍️ CONTADOR DE RESENHAS
// ========================================================================

async function carregarContadorResenhas(uid) {

    const elResenhas =
        document.getElementById("stat-resenhas");

    if (!elResenhas) return;


    // Mostra um estado enquanto carrega.

    elResenhas.innerText = "...";


    try {

        const q = query(
            collection(db, "resenhas"),
            where("uid", "==", uid)
        );


        // Em vez de baixar todas as resenhas,
        // o Firebase retorna apenas a quantidade.

        const resultado =
            await getCountFromServer(q);


        elResenhas.innerText =
            resultado.data().count;


    } catch (error) {

        console.error(
            "Erro ao carregar quantidade de resenhas:",
            error
        );

        elResenhas.innerText = "0";
    }
}


// ========================================================================
// 📷 TEXTO DA FOTO SELECIONADA
// ========================================================================

window.atualizarTextoFoto = function(input) {

    const label =
        document.getElementById("label-foto");


    if (
        label &&
        input.files &&
        input.files[0]
    ) {

        label.innerText =
            "💋 Foto Selecionada!";

        label.style.background =
            "#e8f5e9";

        label.style.color =
            "#c485e3";

        label.style.borderColor =
            "#914bbc";
    }
};


// ========================================================================
// 🔔 TOAST
// ========================================================================

window.mostrarToast = function(
    mensagem,
    tipo = "padrao"
) {

    const toast =
        document.getElementById("toast");


    if (!toast) {

        // Caso o elemento não exista,
        // usa alert como segurança.

        alert(mensagem);

        return;
    }


    toast.innerText = mensagem;

    toast.className =
        `toast show ${tipo}`;


    setTimeout(() => {

        toast.className =
            toast.className
                .replace("show", "")
                .trim();

    }, 3000);
};