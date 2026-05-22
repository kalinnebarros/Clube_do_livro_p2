import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
        // 1. Preenche o nome e e-mail vindos do login
        document.getElementById('perfil-nome').value = user.displayName || "";
        document.getElementById('perfil-email').value = user.email || ""; 
        
        const avatarContainer = document.getElementById('perfil-avatar');
        if (avatarContainer) {
            // Estilização forçada de segurança absoluta para o avatar redondo
            avatarContainer.style.width = "120px";
            avatarContainer.style.height = "120px";
            avatarContainer.style.borderRadius = "50%";
            avatarContainer.style.display = "flex";
            avatarContainer.style.alignItems = "center";
            avatarContainer.style.justifyContent = "center";
            avatarContainer.style.margin = "20px auto"; // Espaço centralizado perfeito
            avatarContainer.style.background = "#ef5f81";
            avatarContainer.style.color = "white";
            avatarContainer.style.fontSize = "2.5rem";
            avatarContainer.style.fontWeight = "bold";
            avatarContainer.style.overflow = "hidden"; 
            avatarContainer.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

            // 2. Busca a foto no Firestore
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

        // --- ORGANIZAÇÃO VISUAL COMPLETA DA PÁGINA PERFIL ---
        organizarLayoutFormulario();

    } else {
        window.location.href = "login.html";
    }
});

// Organiza as caixas, botões e labels centralizados em formato de painel
function organizarLayoutFormulario() {
    // 1. Tenta encontrar ou criar um contêiner centralizado para o formulário
    const avatar = document.getElementById('perfil-avatar');
    if (!avatar) return;
    
    const pai = avatar.parentElement;
    if (pai) {
        pai.style.maxWidth = "450px";
        pai.style.margin = "40px auto";
        pai.style.padding = "25px";
        pai.style.background = "#ffffff";
        pai.style.borderRadius = "20px";
        pai.style.boxShadow = "0 4px 20px rgba(0,0,0,0.05)";
        pai.style.fontFamily = "sans-serif";
    }

    // 2. Estiliza os inputs (caixas de texto)
    const inputs = ['perfil-nome', 'perfil-email'];
    inputs.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.style.width = "100%";
            campo.style.boxSizing = "border-box";
            campo.style.padding = "12px";
            campo.style.margin = "6px 0 16px 0";
            campo.style.borderRadius = "10px";
            campo.style.border = "1px solid #e0e0e0";
            campo.style.fontSize = "1rem";
            campo.style.background = id === 'perfil-email' ? "#f9f9f9" : "#ffffff";
        }
    });

    // 3. Modifica a estilização visual dos botões para ficarem lindos e padronizados
    const botoes = document.getElementsByTagName('button');
    for (let btn of botoes) {
        btn.style.padding = "12px 20px";
        btn.style.margin = "5px 4px";
        btn.style.borderRadius = "10px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "0.95rem";
        btn.style.transition = "all 0.2s";

        if (btn.innerText.includes("Salvar")) {
            btn.style.background = "#ef5f81";
            btn.style.color = "white";
            btn.style.width = "100%"; // Botão principal largo
            btn.style.margin = "10px 0";
        } else if (btn.innerText.includes("Redefinir") || btn.innerText.includes("Senha")) {
            btn.style.background = "#f0f0f0";
            btn.style.color = "#444";
        } else if (btn.innerText.includes("Sair")) {
            btn.style.background = "#fff";
            btn.style.color = "#ef5f81";
            btn.style.border = "1px solid #ef5f81";
            btn.style.width = "100%";
            btn.style.marginTop = "25px";
        }
    }
}

// Função para converter foto em texto (Base64)
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
    if (!novoNome.trim()) return alert("O nome não pode ficar vazio! 😉");

    try {
        if (arquivoFoto) {
            const fotoTexto = await transformarEmTexto(arquivoFoto);
            
            await setDoc(doc(db, "usuarios", user.uid), {
                foto: fotoTexto,
                nome: novoNome,
                email: user.email
            }, { merge: true });
        } else {
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: novoNome
            }, { merge: true });
        }

        await updateProfile(user, { displayName: novoNome });

        alert("Perfil das Mais Mais atualizado com sucesso! ✨");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar: " + e.message);
    }
};

window.esqueciSenha = () => {
    if (!auth.currentUser) return;
    sendPasswordResetEmail(auth, auth.currentUser.email)
        .then(() => alert("E-mail de troca de senha enviado! Verifique sua caixa de entrada."))
        .catch(e => alert("Erro: " + e.message));
};

window.sair = () => signOut(auth).then(() => window.location.href = "login.html");