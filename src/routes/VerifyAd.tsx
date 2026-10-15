import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({
  component: VerifyComponent,
});

function VerifyComponent() {
  const continueToVerification = () => {
    // The bot issues a short-lived token for the static verification page.
    // Preserve the query string so that page can validate the actual session.
    window.location.href = `/verify.html${window.location.search}`;
  };

  return (
    <main
      lang="si"
      className="flex min-h-screen flex-col items-center justify-center bg-[#0e0e12] px-5 py-10 text-center text-white"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-bold">බාගත කිරීම තහවුරු කරන්න</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          බාගත කිරීමේ සබැඳිය Telegram bot එකෙන් ලැබුණු කෙටි කාලීන token එකක් භාවිතා කර තහවුරු කරනවා.
          දැන්වීම් අවහිර කරන browser ආරක්ෂණ නිසා sponsor පිටුව නොපෙනෙන්න පුළුවන්.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          පහළ බොත්තම ඔබා නිවැරදි verification පිටුවට යන්න. එහි උපදෙස් අනුගමනය කරන්න.
          සබැඳිය අවලංගු නම් Telegram bot එකෙන් අලුත් සබැඳියක් ලබාගන්න.
        </p>
        <button
          type="button"
          onClick={continueToVerification}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-sky-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-sky-300"
        >
          Verification පිටුවට යන්න
        </button>
        <a href="/" className="mt-4 inline-block text-sm font-semibold text-sky-300 underline">
          PixelPopLK වෙත ආපසු යන්න
        </a>
      </div>
    </main>
  );
}
