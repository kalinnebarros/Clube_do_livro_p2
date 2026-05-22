import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

async function carregarBiblioteca() {
    const listaContainer = document.getElementById('lista-livros-historico');
    if (!listaContainer) return;

    listaContainer.innerHTML = "<p style='text-align:center; color:#666;'>Abrindo os arquivos do clube... 🔎</p>";

    try {
        const resenhasRef = collection(db, "resenhas");
        const snapshot = await getDocs(resenhasRef);
        
        const livrosProcessados = {}; 

        if (snapshot.empty) {
            listaContainer.innerHTML = "<p style='text-align:center; color:#666;'>A estante está vazia. Publique uma resenha na Home para inaugurar a biblioteca! 📚</p>";
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.livro) {
                // Deixa o nome certinho (Ex: "Verity")
                const nomePadrao = data.livro.trim().charAt(0).toUpperCase() + data.livro.trim().slice(1).toLowerCase();
                
                // Pega a capa enviada na resenha
                const urlCapa = data.capaLivro ? data.capaLivro.trim() : "";

                // Só salva ou atualiza a capa se o link for válido (começar com http ou https)
                if (urlCapa.startsWith("http")) {
                    livrosProcessados[nomePadrao] = urlCapa;
                } else if (!livrosProcessados[nomePadrao]) {
                    // Se não tiver foto válida ainda, deixa vazio temporariamente
                    livrosProcessados[nomePadrao] = "";
                }
            }
        });

        listaContainer.innerHTML = "";
        listaContainer.style.display = "flex";
        listaContainer.style.flexWrap = "wrap";
        listaContainer.style.gap = "20px";
        listaContainer.style.justifyContent = "flex-start"; // Organiza a partir da esquerda
        listaContainer.style.padding = "20px 0";

        const nomesDosLivros = Object.keys(livrosProcessados);

        nomesDosLivros.forEach(nomeLivro => {
            const capaUrl = livrosProcessados[nomeLivro];
            const item = document.createElement('div');
            item.classList.add('livro-item');
            
            item.style.cursor = "pointer";
            item.style.background = "white";
            item.style.padding = "12px";
            item.style.borderRadius = "12px";
            item.style.boxShadow = "0 4px 10px rgba(0,0,0,0.06)";
            item.style.textAlign = "center";
            item.style.width = "140px"; 
            item.style.transition = "transform 0.2s";

            item.onmouseenter = () => item.style.transform = "scale(1.03)";
            item.onmouseleave = () => item.style.transform = "scale(1)";

            // Se o link da capa estiver quebrado ou vazio, mostra o ícone rosa bonitinho ao invés do quadrado quebrado
            item.innerHTML = `
                ${capaUrl ? 
                    `<img src="${capaUrl}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">` : 
                    `<div style="width:100%; height:200px; background:#ef5f81; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">📖</div>`
                }
                <p style="margin: 8px 0 0 0; color:#333; font-size:0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <strong>${nomeLivro}</strong>
                </p>
            `;
            
            item.onclick = () => mostrarResenhasHistoricas(nomeLivro);
            listaContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Erro ao carregar os dados da biblioteca:", error);
        listaContainer.innerHTML = "<p style='text-align:center; color:red;'>Erro ao acessar o banco de dados.</p>";
    }
}
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
            
            // Comparação antiga (Exata) e Comparação nova (Letras minúsculas)
            const nomeBancoOriginal = data.livro ? data.livro.trim() : "";
            const nomeBancoMinusculo = data.livro ? data.livro.trim().toLowerCase() : "";
            
            const nomeBuscadoOriginal = nome ? nome.trim() : "";
            const nomeBuscadoMinusculo = nome ? nome.trim().toLowerCase() : "";

            // 🌟 Testa de todas as formas possíveis para garantir que nenhum livro suma!
            if (nomeBancoOriginal === nomeBuscadoOriginal || nomeBancoMinusculo === nomeBuscadoMinusculo) {
                encontrouResenha = true;

                const podeApagar = usuarioLogado && (usuarioLogado.uid === data.uid || usuarioLogado.uid === ADMIN_UID);

                // 💬 BUSCA OS COMENTÁRIOS DA RESENHA
                let codigosComentarios = "";
                try {
                    const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
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
                card.style.background = "#f9f9f9";
                card.style.padding = "15px";
                card.style.borderRadius = "12px";
                card.style.marginBottom = "20px";
                card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                
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

// 🔒 SÓ CARREGA APÓS A CONFIRMAÇÃO DO FIREBASE AUTH
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuário validado com sucesso:", user.uid);
        carregarBiblioteca();
    } else {
        console.log("Usuário não logado. Redirecionando...");
        window.location.href = "login.html";
    }
});