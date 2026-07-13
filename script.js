import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, 
    serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Oculta o conteúdo da página imediatamente ao carregar o script para evitar o "piscar"
document.body.style.display = "none";

// =========================================================================
// 📚 CONFIGURAÇÃO MANUAL DO LIVRO DO MÊS
// Mude para null se quiser deixar sem livro (ex: const LIVRO_MANUAL = null;)
// =========================================================================
const LIVRO_MANUAL = {
    id: "Vidas_secas26", 
    titulo: "Vidas Secas",
    autor: "Graciliano Ramos",
    capa: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcSkr3v4DGqY3u0EXq_Wehl9uKdTVjMfioLzzDNbsHfph3vWGRQibFRDC9tBu3to-9VpIFRUPAvoQmAgEeGshwHZCB3ExZ8nPFWABiQs3G4&usqp=CAc", 
    descricao: "Vidas Secas, obra de Graciliano Ramos publicada em 1938, narra a saga de uma família de retirantes nordestinos no sertão. Fugindo da seca e da miséria, a história aborda a desumanização, a pobreza extrema e a exploração social",
    link: "https://drive.google.com/file/d/1OoCCArYi0_qrGLnDR2QLApLht4zLmlyP/view?usp=drive_link", 
    linkPDF: "https://drive.google.com/file/d/1kGpGR59xundPef1ao8kgWTLArtQ020XH/view?usp=drive_link" 
};
// =========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyBVqYSFgmI1MZ5wRWCD8r6SyerQ6cQ5WEQ",
    authDomain: "clube-do-livro-ef9b2.firebaseapp.com",
    projectId: "clube-do-livro-ef9b2",
    storageBucket: "clube-do-livro-ef9b2.firebasestorage.app",
    messagingSenderId: "524095033581",
    appId: "1:524095033581:web:b13fa5b2bafe2904ce3ce4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_UID = "be7Xn0enc5axIs7oW9NXDCKldAi2"; 
let usuarioLogado = null;
let desativarEscutaResenhas = null; 

// --- ⏳ SISTEMA DE LOGOUT POR INATIVIDADE ---
let temporizadorInatividade;

function resetarTemporizadorInatividade() {
    clearTimeout(temporizadorInatividade);
    if (usuarioLogado) {
        // 30 minutos = 30 * 60 * 1000 milissegundos
        temporizadorInatividade = setTimeout(fazerLogoutAutomatico, 30 * 60 * 1000); 
    }
}

function fazerLogoutAutomatico() {
    console.log("Sessão expirada por inatividade. Efetuando logout...");
    signOut(auth).then(() => {
        window.location.href = "login.html";
    }).catch((e) => console.error("Erro ao deslogar por inatividade:", e));
}

const eventosInteracao = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
eventosInteracao.forEach(evento => {
    window.addEventListener(evento, resetarTemporizadorInatividade);
});

// --- CONTROLE DE ACESSO COM BLOQUEIO VISUAL ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogado = user;
        if (user.uid === ADMIN_UID) {
            const panel = document.getElementById('admin-panel');
            if(panel) panel.style.display = 'block';
        }
        resetarTemporizadorInatividade();
        escutarResenhasDoLivroAtual();
        
        // Exibe o site apenas se o usuário estiver autenticado
        document.body.style.display = "block";
    } else {
        console.log("Usuário não está logado. Redirecionando para o login...");
        usuarioLogado = null;
        clearTimeout(temporizadorInatividade);
        
        // Envia imediatamente para a tela de login
        window.location.href = "login.html";
    }
});

// Inicializa os elementos da tela
atualizarLivroDoMes();

window.sair = () => signOut(auth).then(() => window.location.href = "login.html");

// --- FUNÇÃO POSTAR RESENHA (PROTEGIDA CONTRA CLIQUES DUPLOS) ---
window.postarResenha = async function() {
    const textoArea = document.getElementById('input-texto');
    const texto = textoArea.value;
    const nota = document.getElementById('input-nota').value;
    const btnPublicar = document.getElementById('btn-publicar') || document.querySelector('button[onclick="postarResenha()"]');

    if (!usuarioLogado) return alert("Aguarde o login ou faça login para publicar! 😉");
    if (!LIVRO_MANUAL) return alert("Não há um livro definido para resenhar no momento!");
    if (!texto.trim()) return alert("Escreva sua resenha antes de publicar! 😉");

    try {
        if (btnPublicar) {
            btnPublicar.disabled = true;
            btnPublicar.innerText = "Publicando... ⏳";
            btnPublicar.style.opacity = "0.6";
        }

        const userDoc = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
        const fotoPerfil = userDoc.exists() ? userDoc.data().foto : "";

        await addDoc(collection(db, "resenhas"), {
            usuario: usuarioLogado.displayName || "Membro",
            uid: usuarioLogado.uid,
            fotoPerfil: fotoPerfil,
            livroId: LIVRO_MANUAL.id, 
            livro: LIVRO_MANUAL.titulo, 
            capaLivro: LIVRO_MANUAL.capa, 
            texto: texto,
            nota: parseInt(nota),
            dataCriacao: serverTimestamp(),
            curtidas: [] 
        });
        
        textoArea.value = "";
        alert("Resenha publicada com sucesso! ✨");
    } catch (e) { 
        console.error("Erro ao salvar resenha:", e); 
    } finally {
        if (btnPublicar) {
            btnPublicar.disabled = false;
            btnPublicar.innerText = "Publicar";
            btnPublicar.style.opacity = "1";
        }
    }
};

// --- ALTERNAR CURTIDA (LIKE / UNLIKE) ---
window.alternarCurtida = async function(resenhaId, jaCurtiu) {
    if (!usuarioLogado) return alert("Você precisa estar logada para curtir as resenhas! ❤️");
    const resenhaRef = doc(db, "resenhas", resenhaId);
    try {
        if (jaCurtiu) {
            await updateDoc(resenhaRef, { curtidas: arrayRemove(usuarioLogado.uid) });
        } else {
            await updateDoc(resenhaRef, { curtidas: arrayUnion(usuarioLogado.uid) });
        }
    } catch (e) { console.error("Erro ao processar curtida:", e); }
};

// --- FEED DE RESENHAS + COMENTÁRIOS EM TEMPO REAL ---
function escutarResenhasDoLivroAtual() {
    if (desativarEscutaResenhas) desativarEscutaResenhas();
    
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!LIVRO_MANUAL) {
        container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhuma resenha disponível.</p>";
        return;
    }

    const q = query(
        collection(db, "resenhas"), 
        where("livroId", "==", LIVRO_MANUAL.id), 
        orderBy("dataCriacao", "desc")
    );

    desativarEscutaResenhas = onSnapshot(q, async (snapshot) => {
        container.innerHTML = "";
        
        if (snapshot.empty) {
            container.innerHTML = "<p style='text-align:center; color:#666;'>Nenhuma resenha disponível para este livro ainda. Seja a primeira! ✍️</p>";
            return;
        }

        for (const postDoc of snapshot.docs) {
            const res = postDoc.data();
            const id = postDoc.id;
            
            const curtidas = res.curtidas || [];
            const qndeCurtidas = curtidas.length;
            const jaCurtiu = usuarioLogado && curtidas.includes(usuarioLogado.uid);
            const podeApagar = usuarioLogado && (usuarioLogado.uid === res.uid || usuarioLogado.uid === ADMIN_UID);

            let nomesQuemCurtiu = [];
            if (qndeCurtidas > 0) {
                const promessas = curtidas.map(async (uidDonoDaCurtida) => {
                    try {
                        const userDoc = await getDoc(doc(db, "usuarios", uidDonoDaCurtida));
                        if (userDoc.exists() && userDoc.data().usuario) {
                            return `@${userDoc.data().usuario}`;
                        }
                        return "Membro do Clube";
                    } catch (e) {
                        return "Membro do Clube";
                    }
                });
                nomesQuemCurtiu = await Promise.all(promessas);
            }
            const textoListaCurtidas = nomesQuemCurtiu.length > 0 ? nomesQuemCurtiu.join(", ") : "Ninguém curtiu ainda";

            const div = document.createElement('div');
            div.classList.add('review-post');
            div.style.marginBottom = "25px";

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${res.fotoPerfil ? `<img src="${res.fotoPerfil}" class="avatar-circle" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : `<div class="avatar-circle" style="width:40px; height:40px; border-radius:50%; background:#ef5f81; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">${(res.usuario || "M").charAt(0).toUpperCase()}</div>`}
                        <div>
                            <strong>@${res.usuario || "Membro"}</strong><br>
                            <span style="font-size:0.8rem; color:#666;">Lendo: <em>${res.livro || "Livro"}</em></span>
                        </div>
                    </div>
                    ${podeApagar ? `
                        <button onclick="deletarResenha('${id}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.1rem; padding:5px;" title="Excluir Resenha">🗑️</button>
                    ` : ''}
                </div>
                <div style="margin-top:10px;">
                    <p>"${res.texto}"</p>
                    <div style="margin-bottom: 10px;">${"⭐".repeat(res.nota || 5)}</div>
                    
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <button 
                            onclick="alternarCurtida('${id}', ${jaCurtiu})" 
                            style="background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0; color: ${jaCurtiu ? '#ef5f81' : '#666'};"
                        >
                            ${jaCurtiu ? '❤️' : '🤍'}
                        </button>
                        <span 
                            title="Curtido por: ${textoListaCurtidas}" 
                            style="font-size: 1.1rem; cursor: help; color: ${jaCurtiu ? '#ef5f81' : '#666'}; font-weight: ${jaCurtiu ? 'bold' : 'normal'}; border-bottom: 1px dashed #ccc;"
                        >
                            ${qndeCurtidas} ${qndeCurtidas === 1 ? 'curtida' : 'curtidas'}
                        </span>
                    </div>
                </div>

                <div style="background: #f7f7f7; padding: 12px; border-radius: 10px; margin-top: 15px;">
                    <span style="font-size: 0.8rem; font-weight: bold; color: #555;">Comentários:</span>
                    <div id="lista-comentarios-${id}" style="margin-top: 5px; max-height: 200px; overflow-y: auto;">
                        <p style="font-size: 0.8rem; color: #999; margin: 5px 0;">A carregar conversas... ☕</p>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <input type="text" id="input-comentario-${id}" placeholder="Responda a esta resenha..." style="flex: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid #ddd; font-size: 0.85rem; outline: none;">
                        <button onclick="postarComentario('${id}')" style="background: #ef5f81; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; cursor: pointer;">Enviar</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
            escutarComentariosDaResenha(id);
        }
    });
}

// --- ESCUTA OS COMENTÁRIOS DE CADA CARD (TEMPO REAL) ---
function escutarComentariosDaResenha(resenhaId) {
    const listaDiv = document.getElementById(`lista-comentarios-${resenhaId}`);
    if (!listaDiv) return;

    const qComentarios = query(
        collection(db, "resenhas", resenhaId, "comentarios"),
        orderBy("dataCriacao", "asc")
    );

    onSnapshot(qComentarios, (snapshot) => {
        listaDiv.innerHTML = "";
        if (snapshot.empty) {
            listaDiv.innerHTML = `<p style="font-size:0.8rem; color:#999; margin: 5px 0 0 5px;">Nenhum comentário ainda. Deixe o seu palpite! 💬</p>`;
            return;
        }
        snapshot.forEach(comDoc => {
            const com = comDoc.data();
            const idComentario = comDoc.id;
            const podeApagarComentario = usuarioLogado && (usuarioLogado.uid === com.uid || usuarioLogado.uid === ADMIN_UID);

            const item = document.createElement('div');
            item.style.background = "white";
            item.style.padding = "6px 10px";
            item.style.borderRadius = "8px";
            item.style.marginTop = "5px";
            item.style.fontSize = "0.85rem";
            item.style.borderLeft = "3px solid #ef5f81";
            item.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";
            
            item.innerHTML = `
                <span><strong>@${com.usuario || "Membro"}:</strong> ${com.texto}</span>
                ${podeApagarComentario ? `
                    <button onclick="deletarComentario('${resenhaId}', '${idComentario}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:0.85rem; padding: 0 5px;" title="Apagar comentário">🗑️</button>
                ` : ''}
            `;
            listaDiv.appendChild(item);
        });
    });
}

// --- FUNÇÃO PARA DELETAR COMENTÁRIO ---
window.deletarComentario = async function(resenhaId, comentarioId) {
    if (!confirm("Deseja mesmo apagar este comentário? 🤔")) return;
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        await deleteDoc(doc(db, "resenhas", resenhaId, "comentarios", comentarioId));
    } catch (e) {
        console.error("Erro ao deletar comentário:", e);
        alert("Você não tem permissão para apagar este comentário.");
    }
};

// --- FUNÇÃO ADICIONAR COMENTÁRIO ---
window.postarComentario = async function(resenhaId) {
    const input = document.getElementById(`input-comentario-${resenhaId}`);
    const texto = input ? input.value : "";

    if (!usuarioLogado) return alert("Precisa de fazer login para comentar! 🌸");
    if (!texto.trim()) return alert("Digite alguma resposta antes de enviar! ✍️");

    try {
        await addDoc(collection(db, "resenhas", resenhaId, "comentarios"), {
            usuario: usuarioLogado.displayName || "Membro",
            uid: usuarioLogado.uid,
            texto: texto.trim(),
            dataCriacao: serverTimestamp()
        });
        input.value = ""; 
    } catch (e) {
        console.error("Erro ao comentar:", e);
        alert("Erro ao enviar comentário.");
    }
};

// --- FUNÇÃO PARA DELETAR RESENHA ---
window.deletarResenha = async function(id) {
    if (!confirm("Tem certeza que deseja apagar essa resenha? 🤔")) return;
    try {
        await deleteDoc(doc(db, "resenhas", id));
        alert("Resenha removida! ✨");
    } catch (e) {
        console.error("Erro ao deletar:", e);
        alert("Você não tem permissão para apagar essa resenha.");
    }
};        

// --- DESENHAR LIVRO NA TELA ---
function atualizarLivroDoMes() {
    const display = document.getElementById('book-display');
    const labelResenha = document.getElementById('livro-atual-resenha');
    
    if (!display) return;

    if (!LIVRO_MANUAL) {
        display.innerHTML = `<p>🎲 O livro do mês ainda não foi sorteado...</p>`;
        if (labelResenha) labelResenha.innerText = "Aguardando próximo sorteio...";
    } else {
        const botaoDownloadEpub = LIVRO_MANUAL.link 
            ? `<a href="${LIVRO_MANUAL.link}" target="_blank" download="${LIVRO_MANUAL.titulo.replace(/\s+/g, '_')}.epub" style="display:inline-block; margin-top:15px; margin-right:10px; padding:8px 16px; background-color:#ef5f81; color:white; text-decoration:none; border-radius:20px; font-weight:bold; font-size:0.9rem;">📥 Baixar EPUB</a>`
            : '';

        const botaoDownloadPdf = LIVRO_MANUAL.linkPDF 
            ? `<a href="${LIVRO_MANUAL.linkPDF}" target="_blank" download="${LIVRO_MANUAL.titulo.replace(/\s+/g, '_')}.pdf" style="display:inline-block; margin-top:15px; padding:8px 16px; background-color:#a91739; color:white; text-decoration:none; border-radius:20px; font-weight:bold; font-size:0.9rem;">📄 Baixar PDF</a>`
            : '';

        display.innerHTML = `
            <div style="display:flex; gap:20px; align-items:center; background:white; padding:20px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                ${LIVRO_MANUAL.capa ? 
                    `<img src="${LIVRO_MANUAL.capa}" style="width:250px; height:350px; border-radius:8px; object-fit: cover;">` : 
                    `<div style="width:110px; height:160px; background:#ef5f81; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">📖</div>`
                }
                <div style="flex: 1;">
                    <h4 style="margin:0; color:#ef5f81; font-size:1.5rem; text-transform: capitalize;">${LIVRO_MANUAL.titulo || 'Sem título'}</h4>
                    <p style="margin:5px 0;"><strong>Autor:</strong> ${LIVRO_MANUAL.autor || 'Desconhecido'}</p>
                    <p style="font-size:0.9rem; color:#555; margin:0; line-height: 1.4;">${LIVRO_MANUAL.descricao || 'Sem descrição cadastrada.'}</p>
                    <div style="display:flex; flex-wrap:wrap;">
                        ${botaoDownloadEpub}
                        ${botaoDownloadPdf}
                    </div>
                </div>
            </div>
        `;
        if (labelResenha) labelResenha.innerText = `Lendo: ${LIVRO_MANUAL.titulo}`;
    }
}
window.atualizarLivroDoMes = atualizarLivroDoMes;

window.addEventListener('DOMContentLoaded', () => {
    if (typeof exibirResenhas === 'function') {
        exibirResenhas(); 
    }
});