import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('perfil-nome').value = user.displayName || "";
        document.getElementById('perfil-email').value = user.email || ""; 
        
        const avatarContainer = document.getElementById('perfil-avatar');
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

            try {
                const docRef = doc(db, "usuarios", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().foto) {
                    avatarContainer.innerHTML = `
                        <img src="${docSnap.data().foto}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:50%;">
                    `;
                } else {
                    avatarContainer.innerText = user.displayName ? user.displayName.charAt(0).toUpperCase() : "?";
                }
            } catch (erro) {
                console.error("Erro ao carregar foto do banco:", erro);
                avatarContainer.innerText = user.displayName ? user.displayName.charAt(0).toUpperCase() : "?";
            }
        }

        carregarContadorResenhas(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

function transformarEmTexto(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.readAsDataURL(arquivo);
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = error => reject(error);
    });
}

window.salvarAlteracoes = async function() {
    const user = auth.currentUser;
    const novoNome = document.getElementById('perfil-nome').value;
    const arquivoFoto = document.getElementById('perfil-foto-arquivo').files[0];
    
    if (!user) return;
    if (!novoNome.trim()) {
        mostrarToast("O nome não pode ficar vazio! ", "erro");
        return;
    }

    try {
        if (arquivoFoto) {
            // Se o usuário selecionou uma nova foto, converte e salva
            const fotoTexto = await transformarEmTexto(arquivoFoto);
            
            await setDoc(doc(db, "usuarios", user.uid), {
                foto: fotoTexto,
                nome: novoNome,
                email: user.email
            }, { merge: true });
        } else {
            // Se NÃO selecionou foto, atualiza apenas o nome sem mexer na foto que já existe no banco
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: novoNome
            }, { merge: true });
        }

        // Atualiza o nome no Firebase Auth
        await updateProfile(user, { displayName: novoNome });

        // Aviso flutuante em vez de alert nativo
        mostrarToast("Perfil atualizado! ✨", "sucesso");
        
        // Atualiza a tela após 1.5s para aplicar as mudanças
        setTimeout(() => location.reload(), 1500);

    } catch (e) {
        console.error(e);
        mostrarToast("Erro ao salvar: " + e.message, "erro");
    }
};

window.esqueciSenha = () => {
    if (!auth.currentUser) return;
    sendPasswordResetEmail(auth, auth.currentUser.email)
        .then(() => alert("E-mail de troca de senha enviado!"))
        .catch(e => alert("Erro: " + e.message));
};

window.sair = () => signOut(auth).then(() => window.location.href = "login.html");

async function carregarContadorResenhas(uid) {
    const elResenhas = document.getElementById('stat-resenhas');
    if (!elResenhas) return;

    try {
        const q = query(collection(db, "resenhas"), where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        elResenhas.innerText = querySnapshot.size;
    } catch (error) {
        console.error("Erro ao carregar quantidade de resenhas:", error);
    }
}

window.atualizarTextoFoto = function(input) {
    const label = document.getElementById('label-foto');
    if (label && input.files && input.files[0]) {
        label.innerText = "💋 Foto Selecionada!";
        label.style.background = "#e8f5e9";
        label.style.color = "#c485e3";
        label.style.borderColor = "#914bbc";
    }
};
// Função para exibir o aviso flutuante
window.mostrarToast = function(mensagem, tipo = 'padrao') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Caso o elemento não exista por algum motivo, usa um alert simples de segurança
        alert(mensagem);
        return;
    }

    toast.innerText = mensagem;
    toast.className = `toast show ${tipo}`;

    setTimeout(() => {
        toast.className = toast.className.replace("show", "").trim();
    }, 3000);
};