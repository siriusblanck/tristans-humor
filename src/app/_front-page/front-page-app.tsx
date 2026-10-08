"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { stablePhoto } from "@/lib/avatars";
import type { VoteValue } from "@/lib/owl-post/inputs";
import { applyVote, chooseOwl, currentOwl, landOwl, nextVote, startStack, syncStack } from "@/lib/owl-post/stack";
import { castVote } from "./actions";
import AccountMenu from "./account-menu";
import { Seal } from "./art";
import { flyGem } from "./gem-flight";
import { useSceneFit, useToast } from "./hooks";
import HouseRail from "./house-rail";
import OwlDelivery from "./owl-delivery";
import OwlStack from "./owl-stack";
import OwlWizard from "./owl-wizard";
import ProfileDialog from "./profile-dialog";
import { readReturn } from "./return-to-owl";
import SignInLetter from "./sign-in-letter";
import VoteDock from "./vote-dock";
import type { FrontPageData, Owl, SignInReason } from "./types";
import controls from "./controls.module.css";
import styles from "./scene.module.css";

type VoteChange = { id: string; value: VoteValue };

/** The Hog Wumbia front page: the prompt bar, the house rail, the owl stack and its dock. */
export default function FrontPageApp({ data, backdrop, sky }: { data: FrontPageData; backdrop: ReactNode; sky: ReactNode }) {
  const scene = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const { viewer } = data;
  useSceneFit();
  const [toast, showToast] = useToast(data.authError);

  // Votes show at once; the server's answer (and the revalidated page) replaces them.
  const [owls, applyOptimisticVote] = useOptimistic(data.owls, (current: Owl[], change: VoteChange) =>
    current.map((owl) => (owl.id === change.id ? applyVote(owl, change.value) : owl)));
  const owlsById = useMemo(() => new Map(owls.map((owl) => [owl.id, owl])), [owls]);

  // Browse in the order the page arrived in, even as votes reshuffle the points.
  const ids = useMemo(() => data.owls.map(({ id }) => id), [data.owls]);
  const [stack, setStack] = useState(() => startStack(ids));
  const synced = syncStack(stack, ids);
  if (synced !== stack) setStack(synced);
  const currentId = currentOwl(synced);
  const current = currentId ? owlsById.get(currentId) : undefined;

  // Each page load signs a new photo URL; keep the one already on screen until the photo changes.
  const signedPhoto = viewer.signedIn ? viewer.photo : null;
  const [photo, setPhoto] = useState(signedPhoto);
  const shownPhoto = stablePhoto(photo, signedPhoto);
  if (shownPhoto !== photo) setPhoto(shownPhoto);

  const [letter, setLetter] = useState<SignInReason | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const [voting, startVote] = useTransition();
  const voteInFlight = useRef(false);

  // Back from Google: reopen the owl you were looking at.
  useEffect(() => {
    const back = readReturn();
    if (!back || !viewer.signedIn) return;
    const index = back.owlId ? synced.order.indexOf(back.owlId) : -1;
    // A one-time read of session storage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (index >= 0) setStack((state) => chooseOwl(state, back.owlId!));
    showToast(back.reason === "owl"
      ? `Signed in as ${viewer.firstName}. Send away.`
      : `Signed in as ${viewer.firstName}. Back on owl ${Math.max(index, 0) + 1} of ${synced.order.length}.`);
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function vote(direction: 1 | -1, button: HTMLButtonElement) {
    if (!current) return;
    if (!viewer.signedIn) {
      setLetter("vote");
      return;
    }
    // A ref, not the transition flag: a double click lands before React re-renders.
    if (voteInFlight.current || current.isMine) return;
    voteInFlight.current = true;
    const owl = current;
    const value = nextVote(owl.myVote, direction);
    startVote(async () => {
      try {
        applyOptimisticVote({ id: owl.id, value });
        // The house's hourglass updates when the revalidated page arrives, after the gem lands.
        const gem = value === 1 && scene.current ? flyGem(scene.current, button, owl.house, styles.gem) : Promise.resolve();
        const [result] = await Promise.all([castVote(owl.id, value), gem]);
        if (!result.ok) showToast(result.error, "alert");
      } catch {
        showToast("Your vote didn't go through. Please try again.", "alert");
      } finally {
        voteInFlight.current = false;
      }
    });
  }

  function sendOwl() {
    if (!viewer.signedIn) return setLetter("owl");
    if (data.remaining <= 0) return showToast("No owls left today. Back tomorrow.");
    if (data.writers.length === 0) return showToast("The writers are away. Try again soon.", "alert");
    setWizardOpen(true);
  }

  function landed(generationId: string) {
    setWizardOpen(false);
    setStack((state) => landOwl(state, generationId));
    showToast("Your owl has landed.");
  }

  const position = currentId ? synced.order.indexOf(currentId) + 1 : 0;

  return (
    <div className={styles.viewport}>
      {sky}
      <div ref={scene} className={styles.scene}>
        <div className={styles.moon} aria-hidden="true" />
        <div className={styles.backdrop} aria-hidden="true">{backdrop}</div>

        <header className={styles.topbar} data-reveal="topbar" inert={wizardOpen}>
          <p className={styles.wordmark}>Hog Wumbia</p>
          <AccountMenu
            viewer={viewer}
            photoUrl={shownPhoto?.url ?? null}
            avatarRef={avatar}
            onSignIn={() => setLetter("signin")}
            onProfile={() => setProfileOpen(true)}
          />
        </header>

        <div className={styles.chipSlot} data-reveal="chip">
          <div className={styles.chip}>
            <Seal className={styles.chipSeal} />
            <div className={styles.chipText}>
              <h1 className={styles.chipHead}>{data.prompt?.headline ?? "This week’s owl is still in the air."}</h1>
              <p className={styles.chipSub}>This week · {data.weekLabel}</p>
            </div>
            <button
              type="button"
              className={styles.chipButton}
              aria-label="Read this week’s letter again"
              onClick={() => setReplay((count) => count + 1)}
              disabled={wizardOpen}
            />
          </div>
        </div>

        <HouseRail rail={data.rail} inert={wizardOpen} />

        <main className={styles.stackWrap}>
          <OwlStack
            owls={owlsById}
            order={synced.order}
            currentId={currentId}
            onNavigate={(id) => setStack((state) => chooseOwl(state, id))}
            landedId={synced.landed}
            sceneRef={scene}
            keyboard={!wizardOpen && letter === null && !profileOpen}
            inert={wizardOpen}
          />
          {current && (
            <div className={styles.dockSlot} data-reveal="dock" inert={wizardOpen}>
              <VoteDock owl={current} voting={voting} onVote={vote} />
            </div>
          )}
          {current && <p className={styles.counter} data-reveal="counter" aria-hidden="true">{position} / {synced.order.length}</p>}
        </main>

        <div className={styles.fabBar} inert={wizardOpen}>
          <button type="button" className={controls.sealButton} data-reveal="fab" onClick={sendOwl}>
            <Seal />
            Send in your owl
          </button>
        </div>

        <nav className={styles.legal} data-reveal="legal" aria-label="About Hog Wumbia" inert={wizardOpen}>
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
        </nav>

        {wizardOpen && (
          <OwlWizard
            writers={data.writers}
            remaining={data.remaining}
            sceneRef={scene}
            onClose={() => setWizardOpen(false)}
            onLanded={landed}
          />
        )}

        <OwlDelivery weekKey={data.weekKey} prompt={data.prompt} weekLabel={data.weekLabel} replay={replay} sceneRef={scene} />

        <div className={styles.toastRegion} role="status">
          {toast?.tone === "status" && <span key={toast.id} className={styles.toast}>{toast.message}</span>}
        </div>
        <div className={styles.toastRegion} role="alert">
          {toast?.tone === "alert" && <span key={toast.id} className={styles.toast}>{toast.message}</span>}
        </div>
      </div>

      <SignInLetter reason={letter} owlId={currentId} onClose={() => setLetter(null)} />

      {profileOpen && viewer.signedIn && (
        <ProfileDialog
          details={{ firstName: viewer.firstName, lastName: viewer.lastName, house: viewer.house, email: viewer.email, photoUrl: shownPhoto?.url ?? null }}
          originRef={avatar}
          onClosed={(saved) => {
            setProfileOpen(false);
            if (saved) showToast("Profile saved.");
          }}
        />
      )}
    </div>
  );
}
