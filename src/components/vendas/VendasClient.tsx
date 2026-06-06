"use client";

import { 
  Search, 
  Plus, 
  MessageSquare,
  X,
  List,
  LayoutGrid,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  UserCheck,
  Loader2,
  Send,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  User,
  Clock,
  Paperclip,
  Smile,
  ImageIcon,
  FileText,
  Square,
  Volume2,
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarCheck,
  Mic,
  Zap,
  Tag,
  History,
  Info,
  Edit2,
  AlertTriangle,
  Reply,
  Camera,
  Thermometer,
  Sparkles,
  Settings,
  Lock,
  ChevronUp,
  Minus,
  Maximize2,
  Minimize2
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import axios, { type AxiosProgressEvent } from "axios";
import { cn, openWhatsApp, getWhatsAppHref } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, addMessage, transferLead, pullLead, sendWhatsAppMessage, addInternalNote, uploadMedia, deleteMessage, updateMessage, getQuickReplies, createQuickReply, deleteQuickReply, updateQuickReply, getLeadById, reactToMessage } from "@/app/actions/leads";
import { getSellers } from "@/app/actions/users";
import { getLeadAnalysis, getConversationSummary, getReplySuggestions, transcribeMessage } from '@/app/actions/ai';
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import KanbanView from "@/components/leads/KanbanView";

// Helper para formatar celular do Brasil
function formatPhoneNumber(phone: string) {
  if (!phone) return "";
  const basePhone = phone.split(':')[0];
  const cleaned = basePhone.replace(/\D/g, "");
  
  if (cleaned.length >= 12 && cleaned.startsWith("55")) {
    if (cleaned.length === 13) { // +55 27 99999-9999
      return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
    }
    if (cleaned.length === 12) { // +55 27 9999-9999
      return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
    }
  }

  // Se não começar com 55 ou tiver tamanho diferente, apenas garante o + na frente
  return basePhone.startsWith("+") ? basePhone : `+${cleaned || phone}`;
}

const statusStyles = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-blue-100 text-blue-800",
  PRESENTED: "bg-orange-100 text-orange-700",
  REMARKETING: "bg-red-100 text-red-700",
  CLOSED: "bg-emerald-600 text-white",
  FOLLOWUP: "bg-teal-100 text-teal-700",
  LOST: "bg-slate-200 text-slate-600",
};

const statusLabels: Record<string, string> = {
  NEW: "Recepção",
  CONTACTED: "Relacionamento",
  PRESENTED: "Apresentação",
  REMARKETING: "Pronto p/ Cadastro",
  CLOSED: "Cadastrado (4Life)",
  FOLLOWUP: "Acompanhamento",
  LOST: "Perdido",
};

export default function VendasClient({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  
  const [newMessage, setNewMessage] = useState("");
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{score:number, status:string, advice:string} | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [fullSummary, setFullSummary] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [chatWindowState, setChatWindowState] = useState<'normal' | 'maximized' | 'minimized'>('normal');
  const [lastNonMinimizedState, setLastNonMinimizedState] = useState<'normal' | 'maximized'>('normal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [isGatilhoOpen, setIsGatilhoOpen] = useState(false);
  const [isGatilhoManagerOpen, setIsGatilhoManagerOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [isStrategicMode, setIsStrategicMode] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Verificação de Permissão: Apenas o dono ou Admin escreve
  const isOwner = selectedLead?.assignedToId === user.id;
  const isUnassigned = !selectedLead?.assignedToId;
  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER';
  const canWrite = isOwner || isUnassigned || isAdmin;

  const assignedSellerName = useMemo(() => {
    if (!selectedLead?.assignedToId) return null;
    const seller = sellers.find(s => s.id === selectedLead.assignedToId);
    return seller?.name || "Outro Parceiro";
  }, [selectedLead?.assignedToId, sellers]);
  const lastLeadIdRef = useRef<string | null>(null);
  const lastMessageCount = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  // Smart Scroll: Só desce se o usuário estiver perto do fundo ou se mudar o lead
  useEffect(() => {
    if (isDetailsOpen && chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      const currentCount = selectedLead?.messages?.length || 0;
      const messageCountChanged = currentCount > lastMessageCount.current;
      
      // Controle de mudança de lead para scroll inicial
      const isNewChatSession = selectedLead?.id !== lastLeadIdRef.current;
      
      if (isNewChatSession || (messageCountChanged && isNearBottom)) {
        // Scroll imediato para novos chats, suave para novas mensagens
        const behavior = isNewChatSession ? "auto" : "smooth";
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 50);
      }
      
      lastMessageCount.current = currentCount;
      lastLeadIdRef.current = selectedLead?.id || null;
    }
  }, [selectedLead?.messages?.length, selectedLead?.id, isDetailsOpen]);

  // Auto-refresh OTIMIZADO quando o chat está aberto (busca APENAS o lead atual, salva enorme banda e resolve lentidão de uploads)
  useEffect(() => {
    if (!isDetailsOpen || !selectedLead?.id) return;
    const fetchOnlyLead = async () => {
       const updatedLead = await getLeadById(selectedLead.id);
       if (updatedLead) setSelectedLead(updatedLead);
    };

    // Zera contador ao entrar no chat
    const clearUnread = async () => {
       if (selectedLead.unreadCount > 0) {
         await updateLead(selectedLead.id, { unreadCount: 0 });
       }
    };
    clearUnread();

    const interval = setInterval(fetchOnlyLead, 1500);
    return () => clearInterval(interval);
  }, [isDetailsOpen, selectedLead?.id, selectedLead?.unreadCount]);

  // Foco automático ao responder
  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      setTimeout(() => messageInputRef.current?.focus(), 100);
    }
  }, [replyingTo]);

  // Suporte a colar imagens (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `print-${Date.now()}.png`, { type: blob.type });
            setSelectedFile(file);
            
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview(e.target?.result as string);
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // Garante que o stream seja conectado ao vídeo assim que o elemento for montado
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraOpen, cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
          setSelectedFile(file);
          setFilePreview(canvas.toDataURL("image/jpeg"));
          stopCamera();
        }
      }, "image/jpeg", 0.95);
    }
  };

  const refreshData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [fetchedLeads, fetchedSellers, fetchedQR] = await Promise.all([
      getLeads(),
      getSellers(),
      getQuickReplies(user.id)
    ]);
    
    // Lista os de produto, mas também puxa os leads virgens (sem interesse listado do bot)
    const filtered = fetchedLeads.filter((l: any) => l.interest === "Produto" || !l.interest);
    setLeads(filtered);
    setSellers(fetchedSellers);
    setQuickReplies(fetchedQR);
    
    // Atualiza o lead selecionado se o modal de detalhes estiver aberto
    if (selectedLead) {
      const updatedLead = fetchedLeads.find((l: any) => l.id === selectedLead.id);
      if (updatedLead) setSelectedLead(updatedLead);
    }
    
    if (!silent) setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || "").includes(searchTerm);
      const matchesStatus = statusFilter === "" || lead.status === statusFilter;
      const matchesSeller = sellerFilter === "" || lead.assignedToId === sellerFilter;
      
      let matchesDate = true;
      if (dateFilter !== "ALL") {
        const leadDate = new Date(lead.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dateFilter === "TODAY") matchesDate = diffDays === 0;
        else if (dateFilter === "YESTERDAY") matchesDate = diffDays === 1;
        else if (dateFilter === "WEEK") matchesDate = diffDays <= 7;
      }

      return matchesSearch && matchesStatus && matchesSeller && matchesDate;
    });
  }, [searchTerm, statusFilter, sellerFilter, dateFilter, leads]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast.error("Você não tem permissão para responder este lead.");
      return;
    }
    if ((!newMessage.trim() && !selectedFile) || !selectedLead || isSending) return;

    setIsSending(true);
    let res;
    let mediaUrl = undefined;
    let mediaType = undefined;
    let fileName = undefined;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      try {
        const uploadRes = await axios.post("/api/upload", formData, {
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            const progress = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total) 
              : 0;
            setUploadProgress(progress);
          },
        });

        if (uploadRes.data.success) {
          mediaUrl = uploadRes.data.url;
          mediaType = uploadRes.data.type;
          fileName = uploadRes.data.name;
        } else {
          alert(uploadRes.data.error || "Erro ao subir arquivo");
          setIsSending(false);
          setUploadProgress(0);
          return;
        }
      } catch (uploadErr) {
        console.error("Erro no upload axios:", uploadErr);
        alert("Erro na conexão durante o envio do arquivo.");
        setIsSending(false);
        setUploadProgress(0);
        return;
      }
    }

    if (isNoteMode) {
      res = await addInternalNote({ leadId: selectedLead.id, content: newMessage, authorId: user.id });
    } else if (isStrategicMode) {
      // Nota Estratégica (Azul) - Usamos como nota interna mas com prefixo para o UI
      res = await addInternalNote({ leadId: selectedLead.id, content: `[STRATEGY] ${newMessage}`, authorId: user.id });
    } else {
      res = await sendWhatsAppMessage({ 
        leadId: selectedLead.id, 
        content: newMessage, 
        authorId: user.id,
        mediaUrl,
        mediaType,
        fileName,
        quotedMessageId: replyingTo?.whatsappId || replyingTo?.id,
        quotedMessageContent: replyingTo?.content
      });
    }

    try {
      if (res.success) {
        // Atualização Otimista: Adiciona a mensagem localmente para feedback instantâneo
        const tempMsg = {
          id: `temp-${Date.now()}`,
          content: newMessage || (mediaType ? `[Arquivo ${mediaType}]` : "Nova Mensagem"),
          mediaUrl,
          mediaType,
          createdAt: new Date().toISOString(),
          author: { id: user.id, name: user.name },
          authorId: user.id,
          isSystem: false,
          isNote: isNoteMode || isStrategicMode,
          isStrategy: isStrategicMode || (newMessage.startsWith("[STRATEGY]")),
          quotedMessageId: replyingTo?.whatsappId || replyingTo?.id,
          quotedMessageContent: replyingTo?.content
        };

        if (selectedLead.messages) {
          setSelectedLead({
            ...selectedLead,
            messages: [...selectedLead.messages, tempMsg]
          });
        }

        setReplyingTo(null);
        setNewMessage("");
        setSelectedFile(null);
        setFilePreview(null);
        setIsEmojiOpen(false);
        setUploadProgress(0);
        // Refresh em background para garantir integridade silenciosa
        refreshData(true);
      } else {

        // Trata erro de limite do Vercel (4.5MB) especificamente se possível, ou exibe o erro retornado
        const errorMsg = res.error || "Ocorreu um erro ao enviar.";
        if (errorMsg.includes("413") || errorMsg.includes("Large")) {
          alert("⚠️ Limite do Vercel atingido (4.5MB). \n\nPara enviar arquivos maiores (até 32MB), você deve acessar o sistema pelo endereço da sua VPS ou usar um serviço de armazenamento externo (S3/Cloudinary).");
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      console.error("Error in send response logic:", err);
      // Fallback para o usuário se o Vercel retornar erro de body size (413) que quebra a ação
      alert("⚠️ Erro de limite de tamanho! O Vercel suporta no máximo 4.5MB. Para arquivos maiores, use o endereço da sua VPS.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const res = await reactToMessage(messageId, emoji, user.id);
    if (res.success) {
      setLeads(prev => prev.map(l => {
        if (l.id === selectedLead.id) {
          return {
            ...l,
            messages: l.messages.map((m: any) => m.id === messageId ? { ...m, reactions: JSON.stringify(res.reactions) } : m)
          };
        }
        return l;
      }));
      if (selectedLead?.id) {
        setSelectedLead((prev: any) => ({
          ...prev,
          messages: prev.messages.map((m: any) => m.id === messageId ? { ...m, reactions: JSON.stringify(res.reactions) } : m)
        }));
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus' 
        : 'audio/webm; codecs=opus';
        
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([audioBlob], `voice_message.${extension}`, { type: mimeType });
        setSelectedFile(file);
        setFilePreview(null);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert("Permissão de áudio negada ou erro no gravador.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingLocked(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      
      if (cancel) {
          audioChunksRef.current = [];
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteMessage = (message: any) => {
    setMessageToDelete(message);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async (forEveryone: boolean) => {
    if (!messageToDelete) return;
    
    setDeleteModalOpen(false);
    const res = await deleteMessage(messageToDelete.id, forEveryone);
    if (res.success) {
      refreshData(true);
    } else {
      alert(res.error);
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    const res = await updateMessage(editingMessageId, editContent);
    if (res.success) {
      setEditingMessageId(null);
      refreshData();
    } else {
      alert(res.error);
    }
  };

  const [newQRTitle, setNewQRTitle] = useState("");
  const [newQRContent, setNewQRContent] = useState("");

  const handleAddGatilho = async () => {
    if (!newQRTitle || !newQRContent) return;
    
    if (editingQR) {
      const res = await updateQuickReply(editingQR.id, { title: newQRTitle, content: newQRContent });
      if (res.success) {
        setNewQRTitle("");
        setNewQRContent("");
        setEditingQR(null);
        refreshData();
      }
    } else {
      const res = await createQuickReply({ title: newQRTitle, content: newQRContent, userId: user.id });
      if (res.success) {
        setNewQRTitle("");
        setNewQRContent("");
        refreshData();
      }
    }
  };

  const handleEditQR = (qr: any) => {
    setEditingQR(qr);
    setNewQRTitle(qr.title);
    setNewQRContent(qr.content);
  };

  const cancelEditQR = () => {
     setEditingQR(null);
     setNewQRTitle("");
     setNewQRContent("");
  };

  const handleCreateInitialGatilhos = async () => {
     const defaultQR = [
       { title: "Fatores de Transferência", content: "Nossos produtos utilizam Nano Fórmulas Inteligentes, que são compostos de alta tecnologia que potencializam a absorção dos nutrientes pelo organismo. Com isso, seu corpo consegue aproveitar ao máximo os benefícios dos ingredientes ativos, promovendo:\n✅ Maior fortalecimento da imunidade\n✅ Redução dos efeitos colaterais de tratamentos\n✅ Mais disposição e bem-estar\n✅Em alguns casos até remissão de doença.\n\nA diferença está na nossa tecnologia exclusiva de Fator de Transferência, que permite resultados mais rápidos e eficazes.\n\nVocê gostaria de saber mais detalhes?" },
       { title: "Prova Social", content: "\"Vou te enviar a história de pessoas que superaram suas doenças, uma das nossas clientes. Durante o tratamento, ela sentia fadiga intensa e baixa imunidade. Depois de usar os suplementos, percebeu melhora na disposição e no sistema imunológico. Hoje, ela recomenda para outras pessoas que estão na mesma luta.\n\n Quer ver mais depoimentos? Me avise!\"" },
       { title: "Preços", content: "1️⃣ *Caixa Essencial — R$ 197,00 + frete*\n✨ Ideal pra quem quer iniciar aos poucos o fortalecimento do sistema imune.\n2️⃣ *Kit Intermediário — R$ 542,00 + frete*\n✨ Ajuda a reativar suas defesas, traz mais energia e menos dores. Inclui orientação da equipe.\n3️⃣ *Kit Avançado — R$ 836,94 + frete*\n✨ Suporte completo, inclui plano alimentar e suplementação para imunidade e metabolismo.\n4️⃣ *Kit Imuno Ouro — R$ 1.399,00 (frete grátis)*\n✨ Para quem precisa de suporte máximo, sintomas persistentes ou prevenção intensa. Inclui reavaliação depois de 3 meses.\nTodos são aprovados pela ANVISA, naturais e com suporte humano em todo o processo. 🌱🤗\n\n Faz sentido para você acessar esses benefícios ?" },
       { title: "Triagem", content: "Escolha uma opção:\n\n1️⃣É indicado por médico?\n2️⃣Quero saber preço!\n3️⃣Estou apenas curiosa (o)" },
       { title: "Novo Cadastro", content: "Para gerar Nota Fiscal e Rastreio de entrega preciso:\n\n🪪 Nome Completo\n📆 Data de Nascimento \n🚹 CPF \n🏠 Endereço completo \n🚛 Cep \n📩 E-mail \n💰Forma de pagamento:\n Pix ou Cartão parcelado 3x" }
     ];

     for (const qr of defaultQR) {
        // Evita duplicatas pelo título
        const exists = quickReplies.some(existing => existing.title === qr.title);
        if (!exists) {
          await createQuickReply({ ...qr, userId: user.id });
        }
     }
     refreshData();
  };


  const handleDeleteGatilho = async (id: string) => {
    if (!confirm("Excluir este gatilho?")) return;
    await deleteQuickReply(id);
    refreshData();
  };

  const handleTransfer = async () => {
    if (!transferUserId || !selectedLead) return;
    
    const res = await transferLead(selectedLead.id, transferUserId, user.id);
    if (res.success) {
      setIsTransferring(false);
      setTransferUserId("");
      refreshData();
    }
  };

  const handlePullLead = async (leadId: string) => {
    const res = await pullLead(leadId, user.id);
    if (res.success) {
      refreshData();
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (!selectedLead) return;
    
    if (newStatus === "CLOSED") {
      const idVidaPlena = prompt("Cadastro confirmado na 4Life! 🎉 Anote o ID/observação do novo associado (opcional):");
      if (idVidaPlena) {
        await addMessage({ leadId: selectedLead.id, content: `✅ Cadastrado na 4Life. Obs: ${idVidaPlena}`, authorId: user.id, isSystem: true });
      }
    } else if (newStatus === "LOST") {
      const reason = prompt("Por que o prospecto foi perdido? (Deixe em branco p/ pular)");
      if (reason) {
        await addMessage({ leadId: selectedLead.id, content: `Prospecto perdido. Motivo: ${reason}`, authorId: user.id, isSystem: true });
      }
    }

    await updateLead(selectedLead.id, { status: newStatus });
    refreshData();
  };

  // Efeito para limpar análise ao trocar de lead
  useEffect(() => {
    if (!selectedLead || !isDetailsOpen) {
      setAiAnalysis(null);
      setAiSuggestions([]);
      setFullSummary(null);
    }
  }, [isDetailsOpen, selectedLead?.id]);

  const handleRefreshAI = async () => {
    if (!selectedLead || isAnalyzing) return;

    const now = Date.now();
    const cooldownMs = 30 * 1000;
    if (now - lastRefreshTime < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastRefreshTime)) / 1000);
      toast.error(`Aguarde ${waitSec}s para analisar novamente.`);
      return;
    }

    setIsAnalyzing(true);
    try {
      const [analysis, suggestions] = await Promise.all([
        getLeadAnalysis(selectedLead.id),
        getReplySuggestions(selectedLead.id)
      ]);

      if (analysis?.status === 'LIMITE') {
        toast.warning("AI Limit reached. Showing cached data.");
      } else {
        setLastRefreshTime(now);
      }

      setAiAnalysis(analysis);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Erro na IA:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInterestChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInterest = e.target.value;
    if (!selectedLead) return;
    
    await updateLead(selectedLead.id, { interest: newInterest });
    await addMessage({ leadId: selectedLead.id, content: `Foco trocado para ${newInterest}. O Lead foi movido/focado com sucesso.`, authorId: user.id, isSystem: true });
    
    alert(`Foco atualizado! Se movido para Afiliados, ele aparecerá na aba Negócios.`);
    setIsDetailsOpen(false);
    refreshData();
  };

  const handleGenerateSummary = async () => {
    if (!selectedLead) return;
    setIsSummarizing(true);
    try {
      const summary = await getConversationSummary(selectedLead.id);
      setFullSummary(summary);
    } catch (error) {
      toast.error("Erro ao gerar resumo.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranscribe = async (messageId: string) => {
    if (!selectedLead) return;
    try {
      const result = await transcribeMessage(messageId);
      if (result) {
        // Atualiza a mensagem no estado local para refletir a transcrição imediatamente
        setSelectedLead({
          ...selectedLead,
          messages: selectedLead.messages.map((m: any) => 
            m.id === messageId ? { ...m, transcription: result } : m
          )
        });
        toast.success("Áudio transcrito com sucesso!");
      } else {
        toast.error("Não foi possível transcrever este áudio.");
      }
    } catch (error) {
      toast.error("Erro ao transcrever.");
    }
  };


  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const leadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      interest: "Produto",
      status: formData.get("status") as string,
      assignedToId: formData.get("assignedToId") as string || undefined,
    };

    const res = await createLead(leadData);

    if (res.success) {
      setIsModalOpen(false);
      refreshData();
    } else {
      alert(res.error);
    }
  };

  const handleKanbanStatusChange = async (leadId: string, newStatus: string) => {
    // Quick optimistic visual feedback then real refresh
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await updateLead(leadId, { status: newStatus });
    refreshData();
  };

  return (
    <div className="p-4 md:p-8 md:pt-8 pt-20 space-y-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-500 w-full overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <ShoppingBag size={14} />
            E-commerce & WhatsApp
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Gestão de Vendas</h1>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-2">
            Pool colaborativo. Puxe leads, converse e converta juntos.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white p-1.5 rounded-[1.25rem] shadow-sm border border-slate-200 justify-center">
            <button 
              onClick={() => setViewMode("table")}
              className={cn("p-2 rounded-xl transition-all duration-300 flex-1 flex justify-center", viewMode === "table" ? "bg-blue-700 text-white shadow-md" : "text-slate-400")}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={cn("p-2 rounded-xl transition-all duration-300 flex-1 flex justify-center", viewMode === "kanban" ? "bg-blue-700 text-white shadow-md" : "text-slate-400")}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3.5 md:py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-800 transition-all w-full sm:w-auto"
          >
            <Plus size={20} />
            Criar Venda Manual
          </button>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: "Total", value: leads.length, icon: UserCheck, color: "blue" },
          { label: "Em Relacionamento", value: leads.filter(l => l.status === "CONTACTED").length, icon: MessageSquare, color: "blue" },
          { label: "Cadastrados", value: leads.filter(l => l.status === "CLOSED").length, icon: CreditCard, color: "emerald" },
          { label: "Meus", value: leads.filter(l => l.assignedToId === user.id).length, icon: UserPlus, color: "purple" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-5 text-center sm:text-left">
            <div className={`p-3 md:p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex-shrink-0`}>
              <stat.icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-1 px-4 bg-white rounded-3xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-center min-h-[70px] md:min-h-[80px]">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 md:bg-white border-none outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
        <select 
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-50 md:bg-white border-none md:border-solid md:border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status: Todos</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select 
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-50 md:bg-white border-none md:border-solid md:border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
        >
          <option value="">Parceiro: Todos</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-50 md:bg-white border-none md:border-solid md:border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="ALL">Período: Tudo</option>
          <option value="TODAY">Hoje</option>
          <option value="YESTERDAY">Ontem</option>
          <option value="WEEK">Últimos 7 dias</option>
        </select>

        {user?.role === 'SELLER' && (
          <button 
            onClick={() => setSellerFilter(sellerFilter === user.id ? "" : user.id)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shrink-0 uppercase tracking-widest",
              sellerFilter === user.id ? "bg-blue-700 text-white shadow-lg" : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
            )}
          >
            <User size={14} />
            <span>{sellerFilter === user.id ? "Vendo Meus Leads" : "Meus Leads"}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 md:h-96 space-y-4">
          <Loader2 className="animate-spin text-blue-700" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Atualizando Central...</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView 
          leads={filteredLeads}
          onEdit={(l) => { setSelectedLead(l); setIsDetailsOpen(true); }}
          onDelete={async (id) => { if (user.role === "ADMIN" && confirm("Excluir totalmente?")) { await deleteLead(id); refreshData(); } }}
          onStatusChange={handleKanbanStatusChange}
        />
      ) : (
        <div className="w-full">
           {/* Versão Moblie (Cards Táteis) */}
           <div className="md:hidden space-y-4 px-1 pb-20">
              {filteredLeads.map((lead: any) => (
                <div 
                  key={lead.id} 
                  onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}
                  className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 active:scale-[0.98] transition-all flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Badge de Não Lida */}
                  {lead.unreadMessagesCount > 0 && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl shadow-lg animate-pulse">
                      {lead.unreadMessagesCount} NOVAS
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                     <div className="relative">
                        {lead.profilePic ? (
                          <img src={lead.profilePic} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" alt="" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-black">{lead.name?.charAt(0)}</div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 truncate leading-tight uppercase tracking-tight text-sm">{lead.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest", statusStyles[lead.status as keyof typeof statusStyles])}>
                             {statusLabels[lead.status as keyof typeof statusLabels]}
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 px-1">
                     <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Última msg:</span>
                        <p className="text-[11px] font-medium text-slate-600 truncate italic">
                          {lead.lastMessage ? lead.lastMessage : "Inicie o atendimento agora..."}
                        </p>
                     </div>
                     <div className="p-3 bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center shrink-0">
                        <MessageSquare size={20} />
                     </div>
                  </div>
                </div>
              ))}
           </div>

           {/* Versão Desktop (Tabela) */}
           <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
             <div className="overflow-x-auto">
               <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Convidado</th>
                      <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Atendimento</th>
                      <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400 text-left md:text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-blue-50/30 transition-all group animate-in slide-in-from-bottom duration-300">
                      <td className="px-6 md:px-8 py-4 md:py-5 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {lead.profilePic ? (
                            <img 
                              src={lead.profilePic} 
                              alt={lead.name} 
                              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                                (e.target as any).nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ display: lead.profilePic ? 'none' : 'flex' }}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200"
                          >
                            <User size={20}/>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                             {lead.name}
                             {lead.unreadCount > 0 && (
                               <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[10px] font-black text-white shadow-lg animate-in zoom-in duration-300">
                                 {lead.unreadCount}
                               </span>
                             )}
                             {lead.aiStatus && (
                               <span className={cn(
                                 "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm",
                                 lead.aiStatus === 'QUENTE' ? "bg-orange-500 text-white animate-pulse" :
                                 lead.aiStatus === 'MORNO' ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
                               )}>
                                 <Thermometer size={10} />
                                 {lead.aiStatus}
                               </span>
                             )}
                          </div>
                          <div className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5">{formatPhoneNumber(lead.phone)}</div>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", lead.assignedTo.id === user.id ? "bg-emerald-500" : "bg-slate-300")}></div>
                            <span className={cn("text-[10px] md:text-xs font-bold", lead.assignedTo.id === user.id ? "text-emerald-700" : "text-slate-500")}>
                              {lead.assignedTo.id === user.id ? "Seu Lead" : lead.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-[10px] md:text-xs font-black text-amber-600 tracking-widest uppercase">Fila Geral</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        <div className="flex flex-col gap-1">
                          <span className={cn("px-3 py-1 md:px-4 md:py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-sm w-fit", statusStyles[lead.status as keyof typeof statusStyles])}>
                            {statusLabels[lead.status as keyof typeof statusLabels]}
                          </span>
                          <div 
                            className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 pl-1 uppercase tracking-widest italic cursor-help"
                            title={`Entrou neste estágio em: ${new Date(lead.updatedAt).toLocaleString('pt-BR')}`}
                          >
                             <Clock size={10} className="text-slate-300" />
                             {(() => {
                               const now = new Date();
                               const updated = new Date(lead.updatedAt);
                               const diffSec = Math.floor((now.getTime() - updated.getTime()) / 1000);
                               const diffMin = Math.floor(diffSec / 60);
                               const diffHours = Math.floor(diffMin / 60);
                               const diffDays = Math.floor(diffHours / 24);

                               if (diffMin < 60) return `${diffMin} min atrás`;
                               if (diffHours < 24) return `${diffHours} horas atrás`;
                               return `${diffDays} dias atrás`;
                             })() as React.ReactNode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5 text-left md:text-right flex justify-start md:justify-end gap-2">
                         {(!lead.assignedTo || (lead.assignedTo.id !== user.id && user.role === 'ADMIN')) && (
                           <button 
                            onClick={() => handlePullLead(lead.id)}
                            className="px-3 py-1.5 bg-blue-700 text-white rounded-xl font-bold text-xs hover:bg-blue-800 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                           >
                             <ArrowRightLeft size={14} /> Puxar
                           </button>
                         )}
                         <button 
                           onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}
                           className="px-4 py-2 bg-blue-700 text-white rounded-xl font-black text-[10px] md:text-sm hover:bg-blue-800 transition-all shadow-lg flex items-center gap-2"
                          >
                            <MessageSquare size={16} />
                            Abrir Chat
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>
      )}

      {isDetailsOpen && selectedLead && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          
          <div 
            className={cn(
              "relative bg-[#f0f2f5] h-full shadow-2xl flex flex-col transition-all duration-300 ease-in-out",
              chatWindowState === 'maximized' ? "w-full" : "w-full md:max-w-4xl",
              chatWindowState === 'minimized' ? "translate-y-[calc(100%-64px)] md:translate-y-[calc(100%-64px)] overflow-hidden" : "translate-y-0",
              isDetailsOpen ? "animate-in slide-in-from-right" : ""
            )}
          >
            {/* Cabeçalho do Chat (Otimizado Mobile) */}
            <header className="p-2 md:p-3 px-4 bg-white flex items-center justify-between border-b border-slate-200 shadow-sm z-10 sticky top-0">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <button 
                  onClick={() => {
                    if (chatWindowState === 'minimized') {
                      setChatWindowState(lastNonMinimizedState);
                    } else {
                      setIsDetailsOpen(false);
                    }
                  }} 
                  className="p-3 -ml-2 text-blue-700 hover:bg-slate-100 rounded-2xl transition-all shrink-0 active:scale-90"
                >
                  {chatWindowState === 'minimized' ? <ChevronUp size={28} /> : <ChevronLeft size={32} />}
                </button>
                <div className="flex-shrink-0">
                  {selectedLead.profilePic ? (
                    <img 
                      src={selectedLead.profilePic} 
                      className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" 
                      alt={selectedLead.name} 
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                        (e.target as any).nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    style={{ display: selectedLead.profilePic ? 'none' : 'flex' }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-base shrink-0"
                  >
                    {selectedLead.name?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="min-w-0 flex-1 relative">
                  <h3 className="text-base font-black text-slate-900 leading-tight truncate">{selectedLead.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold flex items-center gap-1 transition-all", selectedLead.isTyping ? "text-blue-700 animate-pulse scale-105" : "text-emerald-500")}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", selectedLead.isTyping ? "bg-blue-700 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : "bg-emerald-500")}></div>
                      {selectedLead.isTyping ? "Digitando..." : "WhatsApp Online"}
                    </span>
                    {aiAnalysis && (
                      <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm",
                          aiAnalysis.status === 'QUENTE' ? "bg-orange-500 text-white" :
                          aiAnalysis.status === 'MORNO' ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          <Thermometer size={10} className={aiAnalysis.status === 'QUENTE' ? "animate-pulse" : ""} />
                          {aiAnalysis.status} ({aiAnalysis.score}%)
                        </div>
                        <span className="hidden md:block text-[9px] font-bold text-slate-400 italic">"{aiAnalysis.advice}"</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="p-3 rounded-2xl text-blue-700 hover:bg-blue-50 transition-all flex items-center gap-1.5"
                  title="Resumir Conversa"
                >
                  {isSummarizing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                </button>
                <button 
                  onClick={handleRefreshAI}
                  disabled={isAnalyzing}
                  className="p-3 rounded-2xl text-orange-500 hover:bg-orange-50 transition-all flex items-center gap-1.5"
                  title="Calcular Temperatura"
                >
                  {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Thermometer size={20} />}
                </button>

                 <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-slate-100">
                    {/* Botão Minimizar */}
                    <button 
                      onClick={() => {
                        setLastNonMinimizedState(chatWindowState === 'minimized' ? lastNonMinimizedState : (chatWindowState as any));
                        setChatWindowState(chatWindowState === 'minimized' ? lastNonMinimizedState : 'minimized');
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-700 transition-all"
                      title={chatWindowState === 'minimized' ? "Restaurar" : "Minimizar"}
                    >
                      <Minus size={18} />
                    </button>
                    
                    {/* Botão Maximizar / Restaurar */}
                    <button 
                      onClick={() => setChatWindowState(chatWindowState === 'maximized' ? 'normal' : 'maximized')}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-700 transition-all"
                      title={chatWindowState === 'maximized' ? "Restaurar" : "Maximizar"}
                    >
                      {chatWindowState === 'maximized' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {/* Botão Fechar */}
                    <button 
                      onClick={() => setIsDetailsOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                 </div>
              </div>
            </header>

            {/* Modal de Resumo da IA */}
            {fullSummary && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 border border-blue-100">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={16} className="text-blue-600" /> Resumo Inteligente da Conversa
                            </h4>
                            <button onClick={() => setFullSummary(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"><X size={18} /></button>
                        </div>
                        <div className="text-xs font-medium text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar italic bg-blue-50/50 p-4 rounded-2xl">
                            {fullSummary}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">Dica: Use estas informações para agilizar o atendimento.</p>
                    </div>
                </div>
            )}
             {/* Barra de Status Rápida (Kanban) - Design High-End */}
             <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 flex flex-col gap-3 shrink-0 shadow-sm z-20">
                <div className="px-1 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                         <LayoutGrid size={14} />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Estágio da Oportunidade</span>
                   </div>
                   <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50">
                     <span className="text-[8px] font-black text-blue-700 uppercase tracking-tighter">Status Ativo</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                   </div>
                </div>
                <div className="overflow-x-auto whitespace-nowrap flex gap-2.5 scrollbar-hide no-scrollbar pb-1">
                   {Object.entries(statusLabels).map(([key, label]) => {
                     const isActive = selectedLead.status === key;
                     return (
                       <button 
                         key={key} 
                         onClick={async () => {
                            const fakeEvent = { target: { value: key } } as any;
                            handleStatusChange(fakeEvent);
                         }}
                         className={cn(
                           "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
                           isActive 
                             ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 -translate-y-0.5" 
                             : "bg-white text-slate-400 border-slate-100 hover:border-blue-300 hover:text-blue-700 hover:bg-slate-50"
                         )}
                       >
                         {label}
                       </button>
                     );
                   })}
                </div>
             </div>

            {/* Painel de Ações do Lead (Opcional, abre sob o header) */}
            {isTransferring && (
              <div className="p-4 bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300 space-y-4 shadow-sm z-20">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mover Estágio Kanban</label>
                      <select 
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 font-black"
                        value={selectedLead.status}
                        onChange={handleStatusChange}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
                        ))}
                      </select>
                    </div>
                
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foco de Interesse</label>
                        <select 
                          className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 border border-slate-200"
                          value={selectedLead.interest || "Produto"}
                          onChange={handleInterestChange}
                        >
                          <option value="Produto">Produto</option>
                          <option value="Negócio">Negócio</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Geral</label>
                        <select 
                          className={cn("w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-200", statusStyles[selectedLead.status as keyof typeof statusStyles])}
                          value={selectedLead.status}
                          onChange={handleStatusChange}
                        >
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  
                    <div className="space-y-2 border-t pt-2 border-slate-100">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transferir Atendimento</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                          value={transferUserId}
                          onChange={(e) => setTransferUserId(e.target.value)}
                        >
                          <option value="">Selecione outro parceiro...</option>
                          {sellers.map((seller: any) => (
                            <option key={seller.id} value={seller.id}>{seller.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleTransfer}
                          disabled={!transferUserId}
                          className="px-4 py-2 bg-blue-700 text-white font-bold text-xs rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-all shrink-0"
                        >
                          OK
                        </button>
                      </div>
                    </div>
              </div>
            )}

            {/* Mensagens (Fundo WhatsApp) */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-4 relative scroll-smooth"
              style={{ 
                backgroundImage: `url('https://w0.peakpx.com/wallpaper/722/716/OHR-whatsapp-pattern-abstract-flat-style-light-green.jpg')`,
                backgroundSize: '400px',
                backgroundBlendMode: 'soft-light'
              }}
            >
              <div className="flex flex-col gap-2">
                {selectedLead.messages?.map((msg: any) => {
                  const isMe = msg.author?.id === user.id;
                  const isClient = !msg.author && !msg.isSystem;

                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="bg-[#e1f3fb] text-[#54656f] text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wide shadow-sm border border-[#c6e5f1]">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn("flex flex-col gap-1 relative group", isMe ? "items-end" : "items-start")} style={{maxWidth:'85%', alignSelf: isMe ? 'flex-end' : 'flex-start'}}>
                      {!msg.isSystem && (
                        <div className={cn("flex items-center gap-1.5 mb-0.5 transition-transform", isMe ? "mr-4" : "ml-3 group-hover:translate-x-1")}>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            isMe ? "text-emerald-600" : (isClient ? "text-blue-700" : "text-slate-400")
                          )}>
                            {isMe ? `Parceiro: ${user.name}` : (isClient ? selectedLead.name : (msg.author?.name || "Parceiro"))}
                          </span>
                          {!isMe && isClient && (
                            <div className="w-1 h-1 rounded-full bg-blue-600 animate-pulse shadow-[0_0_4px_rgba(79,70,229,0.5)]"></div>
                          )}
                          {isMe && (
                             <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></div>
                          )}
                        </div>
                      )}

                        <div 
                          className={cn(
                            "max-w-[95%] md:max-w-[85%] p-4 rounded-[1.5rem] shadow-sm relative group transition-all cursor-pointer select-none border backdrop-blur-sm",
                            msg.isNote && msg.content?.startsWith("[STRATEGY]") ? "bg-blue-50/90 border-blue-200 text-blue-900 rounded-tr-none shadow-blue-100/50" :
                            msg.isNote ? "bg-amber-50/90 border-amber-200 text-amber-900 rounded-tr-none shadow-amber-100/50" : 
                            isMe ? "bg-gradient-to-br from-[#e2ffc7] to-[#d4f8b0] text-[#111b21] rounded-tr-none border-[#c6e5a1]" : 
                            "bg-white/80 border-slate-100 rounded-tl-none shadow-slate-200/50" // High-end white glass effect for client
                          )}
                        onDoubleClick={() => setReplyingTo(msg)}
                        onTouchStart={(e) => {
                           const touch = e.touches[0];
                           (e.currentTarget as any)._startX = touch.clientX;
                        }}
                        onTouchEnd={(e) => {
                           const touch = e.changedTouches[0];
                           const startX = (e.currentTarget as any)._startX || 0;
                           const diff = touch.clientX - startX;
                           if (diff > 80) {
                              setReplyingTo(msg);
                              e.currentTarget.classList.add('translate-x-4');
                              setTimeout(() => e.currentTarget.classList.remove('translate-x-4'), 150);
                           }
                        }}
                      >
                        {/* Renderização de Mídia */}
                        {msg.mediaUrl && (
                          <div className="mb-2 text-left">
                            {msg.mediaType?.toLowerCase() === 'image' || msg.mediaUrl.startsWith('data:image') ? (
                              <img 
                                src={msg.mediaUrl} 
                                alt="imagem" 
                                className="rounded-xl max-w-full h-auto cursor-pointer border border-black/5 hover:scale-[1.02] active:scale-95 transition-all shadow-sm" 
                                onClick={() => setPreviewImage(msg.mediaUrl)} 
                              />
                            ) : msg.mediaType?.toLowerCase() === 'video' || msg.mediaUrl.startsWith('data:video') ? (
                              <video src={msg.mediaUrl} controls className="rounded-xl max-w-full h-auto border border-black/5 shadow-sm" />
                            ) : msg.mediaType?.toLowerCase() === 'audio' || msg.mediaUrl.startsWith('data:audio') ? (
                              <div className={cn(
                                "flex flex-col gap-2 p-3 rounded-[1.25rem] border shadow-sm min-w-[240px] max-w-full",
                                isMe ? "bg-white/30 border-white/20" : "bg-slate-50 border-slate-100"
                              )}>
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                    isMe ? "bg-white/40 text-black/60" : "bg-blue-700 text-white"
                                  )}>
                                    <Volume2 size={20} />
                                  </div>
                                  <audio src={msg.mediaUrl} controls className="h-8 flex-1 min-w-0 opacity-80 scale-90 -ml-3" />
                                  <div className="flex flex-col pr-2">
                                     {!isMe && !msg.transcription && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); handleTranscribe(msg.id); }}
                                         className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-100 rounded-lg text-[9px] font-black uppercase text-blue-700 hover:bg-blue-700 hover:text-white transition-all shadow-sm mb-1"
                                       >
                                         <Sparkles size={10} /> Transcrever
                                       </button>
                                     )}
                                     <a href={msg.mediaUrl} download className="text-[8px] font-black uppercase text-blue-600 hover:scale-110 transition-all text-center">Salvar</a>
                                  </div>
                                </div>
                                
                                {msg.transcription && (
                                  <div className="mt-1 p-2 bg-white/50 rounded-xl border border-black/5 animate-in slide-in-from-top duration-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Sparkles size={10} className="text-blue-600" />
                                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Transcrição da IA</span>
                                    </div>
                                    <p className="text-[11px] text-slate-700 italic leading-snug">{msg.transcription}</p>
                                  </div>
                                )}
                              </div>

                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-black/5 shadow-sm backdrop-blur-sm min-w-[180px]">
                                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center shadow-inner border border-blue-100 flex-shrink-0">
                                   <FileText size={20} />
                                </div>
                                <div className="truncate flex-1 min-w-0">
                                  <p className="text-[11px] font-black tracking-tighter truncate text-slate-800 leading-tight">Arquivo Recebido</p>
                                  <a href={msg.mediaUrl} target="_blank" className="text-[9px] text-blue-700 font-bold hover:underline flex items-center gap-1 mt-0.5">🚀 Abrir / Download</a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Citação (Reply) renderizada na bolha */}
                        {msg.quotedMessageContent && (
                          <div className={cn(
                            "mb-1 pb-1 flex flex-col gap-0.5 opacity-80 border-l-2 pl-2 rounded",
                            isMe ? "border-blue-400 bg-white/30" : "border-slate-300 bg-black/5"
                          )}>
                             <div className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 text-slate-500">
                               <Reply size={8} /> Respondendo a
                             </div>
                             <div className="text-[10px] line-clamp-1 italic font-medium leading-tight">
                               {msg.quotedMessageContent}
                             </div>
                          </div>
                        )}

                        {editingMessageId === msg.id ? (
                           <div className="flex flex-col gap-2 mt-1">
                              <textarea 
                                value={editContent} 
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-2 text-xs border rounded bg-white font-medium outline-none focus:ring-1 focus:ring-blue-300 h-16 resize-none"
                              />
                              <div className="flex gap-2">
                                 <button onClick={handleSaveEdit} className="text-[10px] font-bold bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm">Salvar</button>
                                 <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold bg-slate-200 px-3 py-1.5 rounded-lg shadow-sm">Cancelar</button>
                              </div>
                           </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <p className="whitespace-pre-wrap text-sm pr-10 leading-snug">{msg.content}</p>
                            {msg.isNote && (
                              <div className="flex items-center gap-1.5 opacity-60 border-t border-amber-200 mt-1 pt-1.5 border-dashed">
                                <div className="w-1 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest italic flex items-center gap-1">
                                  <CalendarCheck size={10} /> Nota para o Time
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1 justify-end mt-1 opacity-60">
                          <span className="text-[9px]">{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && !msg.isNote && (<span className="text-blue-500 font-bold text-[10px]">✓✓</span>)}
                        </div>
                      </div>

                      {/* Ações (visíveis no mobile ao tocar, desktop ao hover) */}
                      <div className={cn(
                        "flex gap-1.5 mt-1 transition-all", 
                        "md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 opacity-100",
                        !isMe && "flex-row-reverse self-start"
                      )}>
                         {/* Botão de Responder (Livre p/ todos) */}
                         <button 
                          onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }} 
                          className="p-2 md:p-1.5 bg-white shadow-sm rounded-lg text-slate-400 hover:text-blue-700 border border-slate-100 transition-all flex items-center justify-center shadow-blue-100"
                          title="Responder"
                         >
                          <Reply size={14}/>
                         </button>

                         {/* Botão de Editar/Excluir (Só p/ quem enviou) */}
                         {isMe && !msg.isSystem && (
                           <>
                             <button 
                              onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }} 
                              className="p-2 md:p-1.5 bg-white shadow-sm rounded-lg text-slate-400 hover:text-blue-700 border border-slate-100 transition-all flex items-center justify-center shadow-blue-100"
                              title="Editar"
                             >
                              <Pencil size={14}/>
                             </button>
                             <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }} 
                              className="p-2 md:p-1.5 bg-white shadow-sm rounded-lg text-slate-400 hover:text-red-500 border border-slate-100 transition-all flex items-center justify-center shadow-red-100"
                              title="Excluir"
                             >
                              <Trash2 size={14}/>
                             </button>
                           </>
                         )}

                          {/* Reações (Estilo WhatsApp) */}
                          <div className={cn(
                            "flex items-center bg-white/90 backdrop-blur-sm border border-slate-100 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100",
                            isMe ? "flex-row" : "flex-row-reverse"
                          )}>
                             {["❤️", "👍", "😂", "😮", "🙏"].map(emoji => (
                               <button 
                                 key={emoji} 
                                 onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                 className="hover:scale-125 transition-all p-1 text-xs"
                               >
                                 {emoji}
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* Display das Reações Recebidas */}
                       {msg.reactions && Object.keys(JSON.parse(msg.reactions)).length > 0 && (
                         <div className={cn(
                           "flex flex-wrap gap-1 mt-1 mb-2 px-2",
                           isMe ? "justify-end" : "justify-start"
                         )}>
                            {Object.entries(JSON.parse(msg.reactions)).map(([emoji, userIds]: [string, any]) => (
                               <div key={emoji} className="bg-white border border-slate-100 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center gap-1 active:scale-90 transition-all cursor-default">
                                  <span>{emoji}</span>
                                  <span className="font-bold text-slate-400">{userIds.length > 1 ? userIds.length : ""}</span>
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                  );
                })}
                {selectedLead.isTyping && (
                  <div className="flex flex-col gap-1 items-start max-w-[82%] self-start animate-in slide-in-from-bottom duration-300 mb-2">
                    <div className="flex items-center gap-1.5 ml-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-600">{selectedLead.name}</span>
                      <div className="w-1 h-1 rounded-full bg-blue-200 animate-pulse"></div>
                    </div>
                    <div className="bg-[#e8f0fe] p-3 px-4 rounded-2xl rounded-tl-none border border-blue-100 flex items-center gap-1 shadow-sm">
                      <div className="flex gap-1.5 items-center h-4">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Barra de Input - Mobile-first sticky bottom */}
            <div className="bg-[#f0f2f5] border-t border-slate-200" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
              
              {/* Barra de Progresso de Upload */}
              {uploadProgress > 0 && (
                <div className="mx-3 mt-3 bg-white p-3 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      Enviando Arquivo...
                    </span>
                    <span className="text-xs font-black text-slate-900">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div 
                      className="h-full bg-blue-700 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview de Arquivo Expandido */}
              {selectedFile && (
                <div className="mx-3 mt-3 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl animate-in slide-in-from-bottom duration-300 z-50">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">Prévia do Envio</span>
                       <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"><X size={20}/></button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 items-center md:items-start bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {filePreview ? (
                        <div className="relative group">
                          <img src={filePreview} className="max-h-64 md:max-h-80 w-auto rounded-xl object-contain border border-white shadow-md transition-transform" alt="preview" />
                          <div className="absolute inset-0 bg-black/5 rounded-xl pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center border border-blue-200 shadow-inner">
                          <FileText size={40}/>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 text-center md:text-left py-2">
                        <p className="text-sm font-black text-slate-800 truncate">{selectedFile.name}</p>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", selectedLead.isTyping ? "text-emerald-500 animate-pulse" : "text-slate-400")}>
                          {selectedLead.isTyping ? "Digitando..." : (selectedLead.interest || "Sem Cadastro")}
                        </p>
                        <div className="mt-3 flex items-center justify-center md:justify-start gap-2">
                           <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase">Pronto para enviar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                    <div className={cn(
                      "flex flex-col md:flex-row items-end gap-3 p-3 md:p-5 bg-white/95 backdrop-blur-md mx-3 md:mx-6 mb-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 relative overflow-hidden",
                      !canWrite && "opacity-80 grayscale-[0.2]"
                    )}>
                      {/* Overlay de Bloqueio (Modo Leitura) */}
                      {!canWrite && (
                        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] z-[90] flex items-center justify-center p-4">
                           <div className="bg-white/90 border border-slate-200 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in zoom-in-95 duration-200">
                              <Lock size={20} className="text-slate-400" />
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modo Apenas Leitura</span>
                                 <p className="text-xs font-bold text-slate-700">Este lead está com {assignedSellerName}</p>
                              </div>
                           </div>
                        </div>
                      )}

                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={handleFileChange} 
                       disabled={!canWrite}
                       className="hidden" 
                       accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                     />
                     <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 text-slate-500 hover:text-blue-700 hover:bg-white rounded-xl transition-all shadow-sm group"
                          title="Anexar Arquivo"
                        >
                          <Paperclip size={22} className="group-hover:rotate-12 transition-transform" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setIsNoteMode(!isNoteMode); setIsStrategicMode(false); }}
                          className={cn(
                            "p-3 rounded-xl transition-all flex items-center gap-2",
                            isNoteMode ? "bg-amber-400 text-white shadow-lg shadow-amber-100" : "text-slate-500 hover:text-amber-500 hover:bg-white"
                          )}
                          title="Nota de Interna (Time)"
                        >
                          <FileText size={22} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setIsStrategicMode(!isStrategicMode); setIsNoteMode(false); }}
                          className={cn(
                            "p-3 rounded-xl transition-all flex items-center gap-2",
                            isStrategicMode ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:text-blue-600 hover:bg-white"
                          )}
                          title="Nota Estratégica (Processo)"
                        >
                          <Zap size={22} />
                        </button>
                        <button 
                          type="button"
                          onClick={handleRefreshAI}
                          className="p-3 text-slate-500 hover:text-purple-600 hover:bg-white rounded-xl transition-all shadow-sm"
                          title="Melhorar com IA"
                        >
                          <Sparkles size={22} />
                        </button>
                     </div>
                
                {/* Sugestões da IA (Dicas Invisíveis para o Lead) */}
                {!isRecording && aiSuggestions.length > 0 && !newMessage && !selectedFile && (
                    <div className="absolute bottom-full mb-3 left-0 right-0 px-3 flex flex-wrap gap-2 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-1.5 mb-1 w-full pl-2">
                             <Sparkles size={12} className="text-blue-600 animate-pulse" />
                             <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">IA Sugere:</span>
                        </div>
                        {aiSuggestions.map((suggestion, idx) => (
                           <button 
                             key={idx} 
                             onClick={() => setNewMessage(suggestion)}
                             className="bg-white/90 backdrop-blur-sm border border-blue-100 px-4 py-2 rounded-2xl text-[11px] font-medium text-blue-800 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all shadow-sm active:scale-95"
                           >
                             {suggestion}
                           </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex-1 flex flex-col md:flex-row items-end gap-2 relative">
                  <div className="flex-1 relative w-full">
                    {/* Banner de Citação (Reply Preview) */}
                    {replyingTo && (
                      <div className="absolute bottom-full mb-3 left-0 right-0 bg-white/95 backdrop-blur-sm border-l-4 border-l-blue-700 rounded-xl p-3 shadow-xl animate-in slide-in-from-bottom flex justify-between items-start z-[80] group overflow-hidden border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                           <div className="text-[9px] font-black uppercase text-blue-700 tracking-widest mb-1 flex items-center gap-1.5">
                             <Reply size={10} />
                             Respondendo a {replyingTo.author?.name || "Convidado"}
                           </div>
                           <p className="text-[11px] text-slate-500 line-clamp-1 italic font-medium">"{replyingTo.content}"</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setReplyingTo(null)} 
                          className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600/10"></div>
                      </div>
                    )}

                    {/* Menu de Gatilhos */}
                    {isGatilhoOpen && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white shadow-2xl rounded-2xl p-2 flex flex-col gap-1 border border-slate-100 animate-in slide-in-from-bottom duration-200 z-[70] max-h-[280px] overflow-y-auto">
                        <div className="flex items-center justify-between p-2 border-b border-slate-50">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gatilhos Rápidos</span>
                           <button type="button" onClick={() => setIsGatilhoManagerOpen(true)} className="text-[10px] font-bold text-blue-700">Gerenciar</button>
                        </div>
                        {quickReplies.length === 0 && (
                          <div className="p-4 text-center">
                             <p className="text-xs text-slate-500 mb-3">Nenhum gatilho criado.</p>
                             <button type="button" onClick={handleCreateInitialGatilhos} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold">Gerar Sugestões</button>
                          </div>
                        )}
                        {quickReplies.map(qr => (
                          <button 
                            key={qr.id} 
                            type="button" 
                            onClick={() => { setNewMessage(qr.content); setIsGatilhoOpen(false); }}
                            className="text-left p-3 hover:bg-slate-50 rounded-xl transition-all"
                          >
                             <div className="font-bold text-xs text-slate-900">{qr.title}</div>
                             <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{qr.content}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {isRecording ? (
                      <div className="w-full h-14 px-4 rounded-3xl bg-white flex items-center justify-between border border-slate-200 shadow-xl overflow-hidden relative">
                         {/* Lado Esquerdo: Feedback Visual de Gravação */}
                         <div className="flex items-center gap-3 z-10">
                            <motion.div 
                              animate={{ opacity: [1, 0, 1], scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                            />
                            <span className="text-sm font-black text-slate-800 tracking-tight font-mono">{formatTime(recordingTime)}</span>
                         </div>
                         
                         {/* Centro: Instruções Dinâmicas */}
                         <AnimatePresence mode="wait">
                           {!isRecordingLocked ? (
                             <motion.div 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, x: -20 }}
                               className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] pointer-events-none z-10"
                             >
                                <motion.div animate={{ x: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1 }}>
                                  <ChevronLeft size={16} className="text-blue-600" />
                                </motion.div>
                                Deslize para cancelar
                             </motion.div>
                           ) : (
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.8 }}
                               animate={{ opacity: 1, scale: 1 }}
                               className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5"
                             >
                                <Lock size={12} fill="currentColor" /> Gravação Fixada
                             </motion.div>
                           )}
                         </AnimatePresence>

                         {/* Lado Direito: Botão Deslizante ou Controles de Trava */}
                         <div className="flex items-center gap-2 z-20">
                            {isRecordingLocked ? (
                              <div className="flex-1 flex items-center justify-between gap-4 px-2">
                                <button 
                                  onClick={() => stopRecording(true)} 
                                  className="p-2 text-slate-900 hover:text-red-500 transition-all active:scale-90"
                                  title="Descartar"
                                >
                                  <Trash2 size={24} strokeWidth={1.5} />
                                </button>

                                <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-[#d11336]"></div>
                                   <span className="text-lg font-medium text-slate-800 tracking-tight font-mono">{formatTime(recordingTime)}</span>
                                </div>

                                {/* Waveform Dummy */}
                                <div className="flex-1 flex items-center justify-center gap-0.5 px-4 h-6 opacity-30">
                                   {[...Array(20)].map((_, i) => (
                                      <motion.div 
                                        key={i} 
                                        animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.05 }}
                                        className="w-[2px] bg-slate-900 rounded-full"
                                      />
                                   ))}
                                </div>

                                <div className="flex items-center gap-4">
                                   <button type="button" className="text-[#d11336] hover:scale-110 active:scale-95 transition-all">
                                      <Pause size={24} fill="currentColor" strokeWidth={0} />
                                   </button>
                                   
                                   <button 
                                     onClick={() => stopRecording(false)} 
                                     className="w-12 h-12 bg-[#00a884] text-white rounded-full shadow-lg hover:bg-[#008f72] transition-all flex items-center justify-center active:scale-90"
                                     title="Enviar Áudio"
                                   >
                                     <Send size={24} className="ml-1" fill="currentColor" strokeWidth={0} />
                                   </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative flex flex-col items-center">
                                {/* Indicador de Trava (Vertical) */}
                                <motion.div 
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="absolute bottom-full mb-6 flex flex-col items-center gap-1 opacity-60 text-slate-400 group"
                                >
                                  <Lock size={14} />
                                  <ChevronUp size={12} className="animate-bounce" />
                                </motion.div>

                                {/* Handle de Gravação (Dual Axis) */}
                                <motion.div 
                                  drag
                                  dragConstraints={{ top: -80, bottom: 0, left: -200, right: 0 }}
                                  dragElastic={0.1}
                                  onDragEnd={(e, info) => {
                                     // Lógica de Cancelar (Esquerda)
                                     if (info.offset.x < -100) {
                                        stopRecording(true);
                                        toast.error("Cancelado");
                                     } 
                                     // Lógica de Travar (Cima)
                                     else if (info.offset.y < -50) {
                                        setIsRecordingLocked(true);
                                        toast.success("Gravação Fixada");
                                     }
                                  }}
                                  className="w-11 h-11 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:bg-emerald-600 transition-colors"
                                >
                                  <Mic size={22} />
                                </motion.div>
                              </div>
                            )}
                         </div>
                      </div>
                    ) : (
                      <textarea 
                        ref={messageInputRef}
                        readOnly={!canWrite}
                        disabled={!canWrite}
                        placeholder={!canWrite ? "Modo apenas leitura..." : (isNoteMode ? "Nota interna..." : "Mensagem...")}
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none min-h-[44px] max-h-[160px] overflow-y-auto pt-3",
                          isNoteMode ? "bg-amber-50 focus:ring-amber-100" : "bg-white",
                          !canWrite && "cursor-not-allowed text-slate-400"
                        )}
                        value={newMessage}
                        onChange={(e) => {
                          if (!canWrite) return;
                          setNewMessage(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        rows={1}
                      />
                    )}

                    {/* Picker de Emojis Premium */}
                    {isEmojiOpen && (
                      <div className="absolute bottom-full mb-3 left-0 z-[100] shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <EmojiPicker 
                          onEmojiClick={(emojiData: EmojiClickData) => {
                            setNewMessage(prev => prev + emojiData.emoji);
                            setIsEmojiOpen(false);
                          }}
                          autoFocusSearch={false}
                          theme={Theme.LIGHT}
                          width={320}
                          height={400}
                          searchDisabled={false}
                          skinTonesDisabled={true}
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    )}
                  </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsNoteMode(!isNoteMode)}
                        title={isNoteMode ? "Mudar para WhatsApp" : "Mudar para Nota Interna"}
                        disabled={!canWrite}
                        className={cn(
                          "w-11 h-11 flex items-center justify-center rounded-2xl transition-all border shadow-sm",
                          isNoteMode ? "bg-amber-400 text-white border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:bg-amber-50",
                          !canWrite && "opacity-50"
                        )}
                      >
                        {isNoteMode ? <CalendarCheck size={22} /> : <FileText size={22} />}
                      </button>

                      {!isNoteMode && !newMessage && !selectedFile ? (
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={startRecording}
                          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-[#00a884] text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Mic size={22} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={(!newMessage.trim() && !selectedFile) || isSending || !canWrite}
                          className={cn(
                            "w-11 h-11 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95",
                            isNoteMode ? "bg-amber-600" : "bg-blue-700",
                            !canWrite && "opacity-50"
                          )}
                        >
                          {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
                        </button>
                      )}
                    </div>
                  </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criação Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">Novo Lead Manual</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-5" onSubmit={handleSaveLead}>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome</label>
                 <input name="name" required placeholder="Ex: João Silva" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Telefone (com DDD)</label>
                 <input name="phone" required placeholder="Ex: 5527999881122" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Atribuir a</label>
                 <select name="assignedToId" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none cursor-pointer font-bold text-slate-900">
                    <option value="">(Deixar na Fila Geral)</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-800 active:scale-95 transition-all mt-4 tracking-widest"
              >
                 CRIAR LEAD AGORA
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciador de Gatilhos */}
      {isGatilhoManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 md:p-10 border-b border-slate-50">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">Gerenciador de Gatilhos</h2>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Personalize suas respostas rápidas</p>
              </div>
              <button 
                onClick={() => { setIsGatilhoManagerOpen(false); cancelEditQR(); }} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Coluna de Cadastro/Edição */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                       {editingQR ? "Editando Gatilho" : "Criar Novo Gatilho"}
                     </h4>
                     {editingQR && (
                       <button onClick={cancelEditQR} className="text-[10px] font-bold text-red-500 hover:underline">Cancelar Edição</button>
                     )}
                   </div>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Título do Botão</label>
                       <input 
                         placeholder="Ex: Preços, Boas-vindas..." 
                         className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900 text-sm"
                         value={newQRTitle}
                         onChange={(e) => setNewQRTitle(e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mensagem do Gatilho</label>
                       <textarea 
                         placeholder="Escreva o texto que será enviado..." 
                         className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-700 text-sm h-48 md:h-64 resize-none"
                         value={newQRContent}
                         onChange={(e) => setNewQRContent(e.target.value)}
                       />
                     </div>
                     <button 
                       onClick={handleAddGatilho}
                       className={cn(
                        "w-full py-5 rounded-2xl font-black shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                        editingQR ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" : "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-200"
                       )}
                     >
                       {editingQR ? "ATUALIZAR GATILHO" : "CRIAR GATILHO AGORA"}
                       <Zap size={20} className={editingQR ? "animate-pulse" : ""} />
                     </button>
                   </div>
                </div>

                {/* Coluna da Lista */}
                <div className="space-y-6 flex flex-col">
                   <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Meus Gatilhos ({quickReplies.length})</h4>
                   <div className="space-y-4">
                     {quickReplies.length === 0 ? (
                       <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                          <Zap size={32} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-sm font-bold text-slate-400">Nenhum gatilho para exibir.</p>
                       </div>
                     ) : (
                       quickReplies.map(qr => (
                         <div key={qr.id} className={cn(
                           "p-5 rounded-2xl border transition-all group relative",
                           editingQR?.id === qr.id ? "bg-amber-50 border-amber-200 ring-2 ring-amber-100 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl hover:border-slate-200"
                         )}>
                            <div className="flex items-center justify-between mb-2">
                               <span className="font-bold text-sm text-slate-900">{qr.title}</span>
                               <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => handleEditQR(qr)} className="text-slate-400 hover:text-blue-700 transition-all" title="Editar"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteGatilho(qr.id)} className="text-slate-400 hover:text-red-600 transition-all" title="Excluir"><Trash2 size={16}/></button>
                               </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{qr.content}</p>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão - Whats-Style */}
      {deleteModalOpen && messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Apagar mensagem para todos?</h3>
              <p className="text-sm font-semibold text-slate-500 leading-relaxed px-4">
                Os contatos que virem esta mensagem deixarão de vê-la.
              </p>
              
              <div className="flex flex-col w-full gap-3 pt-6">
                <button 
                  onClick={() => confirmDelete(true)}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all"
                >
                  APAGAR PARA TODOS
                </button>
                <button 
                  onClick={() => confirmDelete(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  APAGAR APENAS PARA MIM
                </button>
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Imagem - Lightbox */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
            <X size={32} />
          </button>
          <img 
            src={previewImage} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300" 
            alt="Preview"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Interface da Câmera */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
             <span className="text-white font-black text-xs uppercase tracking-[0.2em]">Câmera ao Vivo</span>
             <button onClick={stopCamera} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                <X size={28} />
             </button>
          </header>

          <div className="relative w-full h-full flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="max-w-full max-h-full object-contain"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <footer className="absolute bottom-0 left-0 right-0 p-12 flex justify-center items-center bg-gradient-to-t from-black/60 to-transparent">
             <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-2xl"
             >
                <div className="w-14 h-14 bg-white rounded-full border-2 border-slate-200"></div>
             </button>
          </footer>
        </div>
      )}
    </div>
  );
}
