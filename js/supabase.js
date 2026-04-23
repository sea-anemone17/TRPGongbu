import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://mapuxrdihpqjjojjczpw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcHV4cmRpaHBxampvampjenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzY3NzcsImV4cCI6MjA5MjQxMjc3N30.VYyqWMKyb3Aa5v5obZaVrf751pqbKmUZ7eTsfk1EUcc"
);

// ===== Session =====
export async function fetchSessions(userId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function upsertSession(session, userId) {
  const payload = {
    id: session.id,
    user_id: userId,
    title: session.title,
    subject: session.subject,
    goal: session.goal || "",
    cover_image_path: session.coverImage || null,
    selected_character_id: session.selectedCharacterId || null,
    timer_duration_sec: session.timer?.durationSec ?? 1500,
    timer_remaining_sec: session.timer?.remainingSec ?? 1500,
    timer_is_running: session.timer?.isRunning ?? false,
    timer_last_started_at: session.timer?.lastStartedAt
      ? new Date(session.timer.lastStartedAt).toISOString()
      : null,
    created_at: session.createdAt || new Date().toISOString(),
    updated_at: session.updatedAt || new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("sessions")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSessionRemote(sessionId, userId) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ===== Logs =====
export async function fetchLogs(sessionId, userId) {
  const { data, error } = await supabase
    .from("session_logs")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function insertLog(log, sessionId, userId) {
  const payload = {
    id: log.id,
    session_id: sessionId,
    user_id: userId,
    type: log.type,
    speaker_id: log.speakerId || null,
    speaker_name: log.speakerName || null,
    text: log.text || "",
    roll: log.roll ?? null,
    target: log.target ?? null,
    outcome: log.outcome ?? null,
    created_at: log.createdAt || new Date().toISOString()
  };

  const { error } = await supabase.from("session_logs").insert(payload);
  if (error) throw error;
}

// ===== Characters =====
export async function fetchCharacters(sessionId, userId) {
  const { data, error } = await supabase
    .from("session_characters")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function upsertCharacter(character, sessionId, userId) {
  const payload = {
    id: character.id,
    session_id: sessionId,
    user_id: userId,
    name: character.name,
    avatar_path: character.avatar || null,
    color: character.color || "#7aa2ff",
    description: character.description || "",
    coc: character.coc || {},
    created_at: character.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("session_characters")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCharacterRemote(characterId, userId) {
  const { error } = await supabase
    .from("session_characters")
    .delete()
    .eq("id", characterId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ===== Storage =====
export async function uploadAvatar(file, userId, characterId) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${characterId}.${ext}`;

  const { data, error } = await supabase
    .storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type
    });

  if (error) throw error;
  return data.path;
}

export function getAvatarPublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
