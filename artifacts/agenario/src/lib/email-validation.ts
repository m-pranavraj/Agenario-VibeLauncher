const DISPOSABLE = new Set([
  "mailinator.com","guerrillamail.com","guerrillamail.net","guerrillamail.org",
  "guerrillamail.biz","guerrillamail.de","guerrillamail.info","yopmail.com",
  "yopmail.fr","cool.fr.nf","jetable.fr.nf","nospam.ze.tc","nomail.xl.cx",
  "mega.zik.dj","speed.1s.fr","courriel.fr.nf","moncourrier.fr.nf",
  "monemail.fr.nf","monmail.fr.nf","throwam.com","trashmail.com","trashmail.me",
  "trashmail.net","trashmail.at","trashmail.io","trashmail.org","tempmail.com",
  "temp-mail.org","temp-mail.io","fakeinbox.com","fakeinbox.net","mailnull.com",
  "spamhereplease.com","spamspot.com","wegwerfmail.de","wegwerfmail.net",
  "wegwerfmail.org","tempinbox.com","tempr.email","discard.email","spamoff.de",
  "spamgap.com","filzmail.com","spamfree24.org","e4ward.com","mailnew.com",
  "spamfree.eu","abwesend.de","receiveee.com","trbvm.com","crap.la","mailnesia.com",
  "maildrop.cc","sharklasers.com","guerrillamailblock.com","grr.la","spam4.me",
  "trashmail.fr","objectmail.com","ownmail.net","mailmetrash.com","spamavert.com",
  "trashdevil.com","trashdevil.de","mailin8r.com","spamgourmet.com","spam.la",
  "binkmail.com","safetymail.info","spamfighter.net","dispostable.com",
  "mailnew.com","jetable.net","jetable.org","jetable.de","jetable.pp.ua",
  "nospamfor.us","mytrashmail.com","no-spam.ws","get2mail.fr","lol.ovpn.to",
  "spamkill.info","ieatspam.eu","ieatspam.info","thrma.com","koszmail.pl",
  "10minutemail.com","10minutemail.net","10minutemail.co.za","throwam.com",
  "throwaway.email","yolo.best","zoemail.net","zoemail.org","zoemail.com",
]);

export function validateEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "";

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(trimmed)) return "Enter a valid email address.";

  const domain = trimmed.split("@")[1]?.toLowerCase() ?? "";

  if (
    DISPOSABLE.has(domain) ||
    domain.includes("mailinator") ||
    domain.includes("guerrilla") ||
    domain.includes("yopmail") ||
    domain.includes("trashmail") ||
    domain.includes("tempmail") ||
    domain.includes("throwaway") ||
    domain.includes("10minute")
  ) {
    return "Disposable emails are not allowed. Please use your real email address.";
  }

  return "";
}
