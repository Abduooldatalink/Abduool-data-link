import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseConfig } from "./supabase-config.js";

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const $ = (id) => document.getElementById(id);
const show = (message) => {
  const el = $("supabase-status");
  if (el) el.textContent = message;
  else alert(message);
};

function friendlyError(error) {
  const message = error?.message || "An samu matsala. Ka sake gwadawa.";
  if (/invalid login credentials/i.test(message)) return "Email ko password ba daidai ba ne.";
  if (/user already registered/i.test(message)) return "Wannan email ɗin yana da account. Ka yi login.";
  if (/password should be at least/i.test(message)) return "Password ya kamata ya ƙunshi aƙalla haruffa 6.";
  return message;
}

async function ensureProfile(user) {
  if (!user) return;
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: user.user_metadata?.display_name || "Customer",
    email: user.email || ""
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

async function updateAccountUI(session) {
  const user = session?.user || null;
  const button = $("auth-button");
  if (button) button.textContent = user ? "Account / Logout" : "Login / Register";
  const who = $("signed-in-user");
  if (who) who.textContent = user ? (user.email || "Customer") : "Ba a shiga ba";
}

window.abduoolAuth = {
  async register(email, password, name) {
    if (!email || !password || !name) return show("Cika suna, email da password.");
    if (password.length < 6) return show("Password ya kamata ya ƙunshi aƙalla haruffa 6.");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } }
      });
      if (error) throw error;
      if (data.session) {
        await ensureProfile(data.user);
        show("An ƙirƙiri account ɗinka kuma ka shiga. Idan an buƙaci tabbatar da email, duba inbox ɗinka.");
      } else {
        show("An fara rajista. Duba email ɗinka domin tabbatar da account kafin login.");
      }
    } catch (error) { show(friendlyError(error)); }
  },

  async login(email, password) {
    if (!email || !password) return show("Shigar da email da password.");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfile(data.user);
      await updateAccountUI(data.session);
      show("Ka shiga account ɗinka.");
      closeModal();
    } catch (error) { show(friendlyError(error)); }
  },

  async resetPassword(email) {
    if (!email) return show("Da farko shigar da email ɗinka.");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      show("Idan email ɗin yana da account, za a aika masa hanyar sauya password.");
    } catch (error) { show(friendlyError(error)); }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return show(friendlyError(error));
    await updateAccountUI(null);
    show("An fita daga account.");
  }
};

supabase.auth.onAuthStateChange((_event, session) => {
  updateAccountUI(session);
  if (session?.user) {
    // Run after the auth callback returns to avoid holding the auth lock.
    setTimeout(() => ensureProfile(session.user).catch((error) => {
      console.error("Profile setup:", error);
    }), 0);
  }
});
supabase.auth.getSession().then(({ data, error }) => {
  if (error) console.error("Supabase session:", error);
  updateAccountUI(data?.session || null);
});

window.openSupabaseAuth = () => {
  const body = $("mbody");
  $("mtitle").textContent = "Login / Create account";
  body.innerHTML = `
    <div class="field"><label>Full name (rajista)</label><input id="auth-name" autocomplete="name" placeholder="Sunanka"></div>
    <div class="field"><label>Email</label><input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password (aƙalla haruffa 6)</label><input id="auth-password" type="password" autocomplete="current-password"></div>
    <div class="field"><button class="btn" id="register-btn">Create account</button> <button class="btn dark" id="login-btn">Login</button></div>
    <button class="btn ghost" id="reset-btn">Forgot password?</button>
    <p class="hint" id="supabase-status">Ana amfani da Supabase Authentication.</p>`;
  $("modal").classList.add("open");
  $("register-btn").onclick = () => window.abduoolAuth.register($("auth-email").value.trim(), $("auth-password").value, $("auth-name").value.trim());
  $("login-btn").onclick = () => window.abduoolAuth.login($("auth-email").value.trim(), $("auth-password").value);
  $("reset-btn").onclick = () => window.abduoolAuth.resetPassword($("auth-email").value.trim());
};
