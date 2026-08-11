import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
let abaAtual = "todos"; // "todos" ou "lidos"
let acervoGlobal = {}; // Guarda todos os livros carregados do Firebase
let livrosLidosUsuario = []; // Guarda a lista de IDs/Nomes marcados como lidos pelo usuário

async function carregarBiblioteca() {
    const listaContainer = document.getElementById('lista-livros-historico');
    if (!listaContainer) return;

    listaContainer.innerHTML = "<p style='text-align:center; color:#666;'>Abrindo os arquivos do clube... 🔎</p>";

    try {
        // 1. Busca os livros que o usuário já marcou como lidos no Firestore
        if (usuarioLogado) {
            const userSnap = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
            if (userSnap.exists() && userSnap.data().livrosLidos) {
                livrosLidosUsuario = userSnap.data().livrosLidos;
            } else {
                livrosLidosUsuario = [];
            }
        }

        // 2. Busca todas as resenhas para mapear os livros do acervo
        const resenhasRef = collection(db, "resenhas");
        const snapshot = await getDocs(resenhasRef);
        
        acervoGlobal = {}; 

        if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.livro) {
                    const nomePadrao = data.livro.trim().charAt(0).toUpperCase() + data.livro.trim().slice(1).toLowerCase();
                    const urlCapa = data.capaLivro ? data.capaLivro.trim() : "";

                    if (!acervoGlobal[nomePadrao]) {
                        acervoGlobal[nomePadrao] = {
                            nome: nomePadrao,
                            capa: urlCapa.startsWith("http") ? urlCapa : "",
                            id: data.livroId || nomePadrao
                        };
                    } else if (!acervoGlobal[nomePadrao].capa && urlCapa.startsWith("http")) {
                        acervoGlobal[nomePadrao].capa = urlCapa;
                    }
                }
            });
        }

        renderizarLivros();

    } catch (error) {
        console.error("Erro ao carregar os dados da biblioteca:", error);
        listaContainer.innerHTML = "<p style='text-align:center; color:red;'>Erro ao acessar o banco de dados.</p>";
    }
}

// Renderiza os cards conforme a aba ativa ("todos" ou "lidos")
function renderizarLivros() {
    const listaContainer = document.getElementById('lista-livros-historico');
    if (!listaContainer) return;

    listaContainer.innerHTML = "";
    listaContainer.style.display = "flex";
    listaContainer.style.flexWrap = "wrap";
    listaContainer.style.gap = "20px";
    listaContainer.style.justifyContent = "flex-start";
    listaContainer.style.padding = "20px 0";

    const todosNomes = Object.keys(acervoGlobal);

    // Filtra livros se estiver na aba de "Lidos"
    const livrosFiltrados = todosNomes.filter(nomeLivro => {
        const idLivro = acervoGlobal[nomeLivro].id;
        const jaLido = livrosLidosUsuario.includes(idLivro) || livrosLidosUsuario.includes(nomeLivro);
        return abaAtual === "todos" ? true : jaLido;
    });

    if (livrosFiltrados.length === 0) {
        listaContainer.innerHTML = abaAtual === "lidos"
            ? "<p style='width:100%; text-align:center; color:#666;'>Você ainda não marcou nenhum livro antigo como lido. 📖</p>"
            : "<p style='width:100%; text-align:center; color:#666;'>A estante está vazia. Publique uma resenha na Home para inaugurar a biblioteca! 📚</p>";
        return;
    }

    livrosFiltrados.forEach(nomeLivro => {
        const livro = acervoGlobal[nomeLivro];
        const jaLido = livrosLidosUsuario.includes(livro.id) || livrosLidosUsuario.includes(nomeLivro);

        const item = document.createElement('div');
        item.classList.add('livro-item');
        item.style.cssText = `
            background: white;
            padding: 12px;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.06);
            text-align: center;
            width: 140px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.2s;
        `;

        item.onmouseenter = () => item.style.transform = "scale(1.03)";
        item.onmouseleave = () => item.style.transform = "scale(1)";

        item.innerHTML = `
            <div onclick="mostrarResenhasHistoricas('${nomeLivro}')" style="cursor:pointer;">
                ${livro.capa ? 
                    `<img src="${livro.capa}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">` : 
                    `<div style="width:100%; height:180px; background:#ef5f81; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">📖</div>`
                }
                <p style="margin: 8px 0; color:#333; font-size:0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <strong>${nomeLivro}</strong>
                </p>
            </div>

            <button 
                onclick="toggleMarcarLidoHistorico('${livro.id}', '${nomeLivro}')"
                style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 15px;
                    font-size: 0.75rem;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 8px;
                    background: ${jaLido ? '#28a745' : '#ef5f81'};
                    color: white;
                    transition: 0.2s;
                "
            >
                ${jaLido ? '✅ Lido' : '📖 Marcar Lido'}
            </button>
        `;
        
        listaContainer.appendChild(item);
    });
}

// --- MARCAR E DESMARCAR LIVRO COMO LIDO ---
window.toggleMarcarLidoHistorico = async function(idLivro, nomeLivro) {
    if (!usuarioLogado) return alert("Faça login para salvar suas leituras!");

    const userRef = doc(db, "usuarios", usuarioLogado.uid);
    const identificador = idLivro || nomeLivro;
    const jaLido = livrosLidosUsuario.includes(identificador) || livrosLidosUsuario.includes(nomeLivro);

    try {
        if (jaLido) {
            // Remove do array de lidos
            await updateDoc(userRef, { 
                livrosLidos: arrayRemove(identificador, nomeLivro) 
            });
            livrosLidosUsuario = livrosLidosUsuario.filter(item => item !== identificador && item !== nomeLivro);
        } else {
            // Adiciona ao array de lidos
            await setDoc(userRef, { 
                livrosLidos: arrayUnion(identificador) 
            }, { merge: true });
            livrosLidosUsuario.push(identificador);
        }

        renderizarLivros();

    } catch (e) {
        console.error("Erro ao atualizar status de leitura:", e);
        alert("Erro ao atualizar status de leitura.");
    }
};

// --- ALTERNAR ENTRE AS ABAS "TODOS" E "LIDOS" ---
window.alternarAba = function(aba) {
    abaAtual = aba;
    const btnTodos = document.getElementById('btn-aba-todos');
    const btnLidos = document.getElementById('btn-aba-lidos');
    const titulo = document.getElementById('titulo-aba');
    const subtitulo = document.getElementById('subtitulo-aba');

    if (aba === 'todos') {
        btnTodos.style.background = '#ef5f81';
        btnTodos.style.color = 'white';
        btnTodos.style.border = 'none';

        btnLidos.style.background = 'white';
        btnLidos.style.color = '#ef5f81';
        btnLidos.style.border = '1px solid #ef5f81';

        titulo.innerText = "📖 Todos os Livros do Clube";
        subtitulo.innerText = "Clique nos livros para ler as resenhas ou marque os que você já leu:";
    } else {
        btnLidos.style.background = '#ef5f81';
        btnLidos.style.color = 'white';
        btnLidos.style.border = 'none';

        btnTodos.style.background = 'white';
        btnTodos.style.color = '#ef5f81';
        btnTodos.style.border = '1px solid #ef5f81';

        titulo.innerText = "✅ Minhas Leituras Concluídas";
        subtitulo.innerText = "Abaixo estão os livros do clube que você já marcou como lidos:";
    }

    renderizarLivros();
};

// --- EXIBIR RESENHAS HISTÓRICAS DO LIVRO ---
window.mostrarResenhasHistoricas = async function(nome) {
    document.getElementById('livros-lidos').style.display = 'none';
    const detalhes = document.getElementById('detalhes-livro');
    if (detalhes) detalhes.style.display = 'block';
    
    const nomeSelecionado = document.getElementById('nome-livro-selecionado');
    if (nomeSelecionado) nomeSelecionado.innerText = nome;
    
    const container = document.getElementById('resenhas-antigas-container');
    if (!container) return;
    
    container.innerHTML = "Buscando opiniões das Mais Mais... ☕";

    try {
        const resenhasRef = collection(db, "resenhas");
        const snapshot = await getDocs(resenhasRef);

        container.innerHTML = "";
        let encontrouResenha = false;
        
        for (const documento of snapshot.docs) {
            const data = documento.data();
            const idResenha = documento.id;
            
            const nomeBancoOriginal = data.livro ? data.livro.trim() : "";
            const nomeBancoMinusculo = data.livro ? data.livro.trim().toLowerCase() : "";
            
            const nomeBuscadoOriginal = nome ? nome.trim() : "";
            const nomeBuscadoMinusculo = nome ? nome.trim().toLowerCase() : "";

            if (nomeBancoOriginal === nomeBuscadoOriginal || nomeBancoMinusculo === nomeBuscadoMinusculo) {
                encontrouResenha = true;

                const podeApagar = usuarioLogado && (usuarioLogado.uid === data.uid || usuarioLogado.uid === ADMIN_UID);

                let codigosComentarios = "";
                try {
                    const comentariosRef = collection(db, "resenhas", idResenha, "comentarios");
                    const qComentarios = query(comentariosRef, orderBy("dataCriacao", "asc"));
                    const snapComentarios = await getDocs(qComentarios);
                    
                    if (!snapComentarios.empty) {
                        snapComentarios.forEach(comDoc => {
                            const comData = comDoc.data();
                            const idComentario = comDoc.id;
                            const podeApagarCom = usuarioLogado && (usuarioLogado.uid === comData.uid || usuarioLogado.uid === ADMIN_UID);

                            codigosComentarios += `
                                <div style="background: #ffffff; padding: 8px 12px; border-radius: 8px; margin-top: 5px; font-size: 0.85rem; border-left: 3px solid #ef5f81; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center;">
                                    <span><strong>@${comData.usuario || "Membro"}:</strong> ${comData.texto}</span>
                                    ${podeApagarCom ? `
                                        <button onclick="deletarComentarioHistorico('${idResenha}', '${idComentario}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:0.8rem; padding: 0 5px;" title="Apagar comentário">🗑️</button>
                                    ` : ''}
                                </div>
                            `;
                        });
                    } else {
                        codigosComentarios = `<p style="font-size:0.8rem; color:#999; margin: 5px 0 0 5px;">Nenhum comentário nesta resenha ainda.</p>`;
                    }
                } catch (errCom) {
                    console.error("Erro ao carregar comentários:", errCom);
                    codigosComentarios = `<p style="font-size:0.8rem; color:red;">Não foi possível carregar os comentários.</p>`;
                }

                const card = document.createElement('div');
                card.classList.add('review-post');
                card.style.cssText = "background:#f9f9f9; padding:15px; border-radius:12px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,0.02);";
                
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #eee; padding-bottom:8px; margin-bottom:10px;">
                        <strong>@${data.usuario || "Membro"}</strong>
                        ${podeApagar ? `
                            <button onclick="deletarResenhaHistorica('${idResenha}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.1rem; padding:0 5px;" title="Excluir Resenha">🗑️</button>
                        ` : ''}
                    </div>
                    
                    <p style="font-style: italic; color:#444; margin: 5px 0;">"${data.texto}"</p>
                    <div style="color: #ef5f81; font-size: 0.9rem; margin-bottom: 15px;">${"⭐".repeat(data.nota || 5)}</div>
                    
                    <div style="background: #f0f0f0; padding: 10px; border-radius: 10px; margin-top: 10px;">
                        <span style="font-size: 0.8rem; font-weight: bold; color: #555; display: block; margin-bottom: 5px;">💬 Comentários das Meninas:</span>
                        <div id="comentarios-lista-${idResenha}">
                            ${codigosComentarios}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }
        }

        if (!encontrouResenha) {
            container.innerHTML = "<p style='color:#666; text-align:center;'>Nenhuma opinião detalhada encontrada para este título.</p>";
        }

    } catch (e) {
        console.error("Erro real do Firebase:", e);
        container.innerHTML = "<p style='color:red;'>Erro interno ao carregar os comentários. Verifique o console.</p>";
    }
};

window.voltarParaLista = () => {
    document.getElementById('livros-lidos').style.display = 'block';
    document.getElementById('detalhes-livro').style.display = 'none';
};

// 🔒 AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    usuarioLogado = user;
    if (user) {
        carregarBiblioteca();
    } else {
        window.location.href = "login.html";
    }
});