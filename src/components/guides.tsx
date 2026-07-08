// Guide content for the per-page help popovers (PageGuide). Kept in one place so
// the copy is easy to tweak. Each export is plain JSX rendered inside PageGuide.

export const AccountGuide = (
  <>
    <p>Your details and profile picture — used to pre-fill and personalise the rest of your setup.</p>
    <p>If you signed in with <strong>Google</strong> or <strong>GitHub</strong>, don&apos;t forget to also <strong>set a password</strong> below so you can log in directly too.</p>
  </>
);

export const FeedsGuide = (
  <>
    <p>Add feeds from <a href="https://rss.app" target="_blank" rel="noopener noreferrer">rss.app</a>. Raw posts are pulled in, processed, and pushed to your Stats page and Telegram (if set up).</p>
    <ul>
      <li><strong>Share</strong> — processed data is shared on the public <strong>Stats</strong> page for all users. If off, it only appears under <strong>Personal</strong> in Stats.</li>
      <li><strong>Notify</strong> — lets this feed&apos;s output be sent to your Telegram channel (if configured).</li>
    </ul>
  </>
);

export const TelegramGuide = (
  <>
    <p>Choose the channel type: <strong>Main</strong> sends the processed posts; <strong>Filtered</strong> also applies the rules from your Job Filtering System (JFS).</p>
    <p>Three steps:</p>
    <ul>
      <li>Create a bot and paste its <strong>token</strong>.</li>
      <li>Create a channel and add that bot to it.</li>
      <li>Get that channel&apos;s <strong>Chat ID</strong>.</li>
    </ul>
    <p>Details for each are in the sections below.</p>
  </>
);

export const BotTokenGuide = (
  <p>Message the official <strong>@BotFather</strong> on Telegram, send the <code>/newbot</code> command, and follow the prompts to choose a name and username — it then generates your API token.</p>
);

export const ChatIdGuide = (
  <p>Open Telegram, search for <strong>@RawDataBot</strong> (or <strong>@ShowJsonBot</strong>) and press <strong>Start</strong>. Forward a message to it from your channel/group (the bot must be a member), then read the <code>id</code> value in its reply.</p>
);

export const JfsGuide = (
  <p>Set filters for the processed posts. If a job post satisfies <strong>ANY</strong> of the filter groups here, it&apos;s sent to your <strong>Filtered</strong> Telegram channel.</p>
);

export const SchedulesGuide = (
  <>
    <p>Add schedules so your feeds run on a cadence and the matching job runs. Jobs:</p>
    <ul>
      <li><strong>check-jobs</strong> — call feeds → process → filter (if set) → save to Stats (public if the feed is <strong>Share</strong>, else Personal) → send to Telegram.</li>
      <li><strong>stats-ingest</strong> — same as check-jobs, but never sends to Telegram.</li>
      <li><strong>scrape</strong> — query LinkedIn by location, time window and keywords, then send the raw results to Telegram as an Excel file.</li>
    </ul>
  </>
);

export const StatsGuide = (
  <>
    <p>Statistics for every post we&apos;ve received. <strong>Total</strong> = your Share feeds plus every user&apos;s Share feeds; <strong>Personal</strong> = only your own feeds&apos; output.</p>
    <p>Every component is filterable and interactive — don&apos;t hesitate to play around :)</p>
  </>
);

export const AppliedGuide = (
  <p>When you click a job link from a Telegram post, it&apos;s counted as <strong>applied</strong> and logged here — with the job details and how long you took to apply. So please apply using those links.</p>
);

export const CvGuide = (
  <>
    <p>Upload your CV (<strong>PDF</strong> or <strong>Word .docx</strong>) — it&apos;s parsed in your browser and <strong>never sent to our server</strong>.</p>
    <p>Pick a target market (industry, category, seniority, country…). We pull that slice&apos;s in-demand skills, keywords, programming languages, software and certificates from the live data, then check how many your CV covers.</p>
    <p>You get a demand-weighted <strong>alignment score</strong> and the highest-demand items you&apos;re missing — good candidates to add to your resume.</p>
  </>
);

export const MessagesGuide = (
  <>
    <p>Press <strong>New</strong>, enter a username or email, and your message is delivered. It&apos;s not a live chat — refresh to see the latest.</p>
    <p><strong>General Admin Query</strong> reaches the admins, so chuck anything you need there.</p>
  </>
);
