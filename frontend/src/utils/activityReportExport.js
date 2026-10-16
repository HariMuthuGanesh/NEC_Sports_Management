import jsPDF from 'jspdf';

export const countLabel = (count, singular, plural = `${singular}s`) => `${count} ${Number(count) === 1 ? singular : plural}`;

export const reportDate = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Date not recorded';
export function mediaUrl(value) {
  if (!value) return '';
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const url = new URL(value, `${base}/`);
  return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
}

async function loadPhoto(photo) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Photo could not be loaded: ${photo.title}. Retry or turn off Include photos.`)), 15000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error(`Photo could not be loaded: ${photo.title}. Retry or turn off Include photos.`)); };
    image.src = mediaUrl(photo.media_url);
  });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/jpeg', .9), ratio: canvas.height / canvas.width };
}

export async function exportActivityReport(report, includePhotos) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16, width = 178, bottom = 278;
  let y = 18;
  const room = height => { if (y + height > bottom) { pdf.addPage(); y = 18; } };
  const text = (value, size = 10, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(value ?? '').replaceAll('–', '-').replaceAll('—', '-'), width);
    const height = size * .45;
    for (const line of lines) { room(height); pdf.text(line, left, y); y += height; }
    y += 3;
  };
  const heading = title => { room(24); y += 4; text(title, 13, true); };
  const activity = item => {
    heading(item.name);
    text(`${reportDate(item.scheduled_time)} | ${item.kind} | ${item.sport} | ${item.round} | ${item.status}`);
    text([item.category, item.venue, item.tournament].filter(Boolean).join(' | '));
    if (item.kind === 'Match') text(['Completed', 'Ongoing'].includes(item.status)
      ? `Score: ${item.score_a} - ${item.score_b}${item.winner ? ` | Winner: ${item.winner}` : item.status === 'Completed' ? ' | No winner recorded' : ''}` : 'Result pending');
    for (const entry of item.results) {
      text(`${entry.rank ? `Place ${entry.rank}` : 'Unranked'} | ${entry.name} | ${entry.department} | ${entry.result_value == null ? '-' : `${Number(entry.result_value)} ${item.unit}`} | ${entry.result_status}`, 10, true);
      text(entry.athletes.map(a => a.student_name).join(', '));
    }
    text(`Recorded participants: ${item.participants.length}. ${item.participants.map(p => `${p.student_name} (${p.department})`).join(', ') || 'Attendance or results not recorded.'}`);
  };
  text('NATIONAL ENGINEERING COLLEGE', 17, true);
  text('Kovilpatti, Tamil Nadu | Department of Physical Education');
  heading('Sports Activity Report');
  text(`${reportDate(report.period.from)} to ${reportDate(report.period.to)} | ${report.scope} report`);
  heading('Period overview');
  const s = report.summary;
  text(`${countLabel(s.events, 'event')} | ${countLabel(s.matches, 'match', 'matches')} | ${countLabel(s.competitions, 'competition')} | ${countLabel(s.participants, 'distinct recorded athlete')}`);
  text(`${s.completed} completed activities; ${s.ongoing} ongoing; ${s.pending} scheduled or postponed.`);
  if (!s.events && !s.matches && !s.competitions) text('No sports activities recorded for this period.');
  if (includePhotos) text(`${countLabel(s.photos, 'event photo')} attached.`);
  for (const [index, event] of report.events.entries()) {
    heading(`${index + 1}. ${event.name}`);
    text(`${event.sport} | ${event.category} | ${event.tournament || ''}`);
    text(`${reportDate(event.start_time)}${event.end_time ? ` to ${reportDate(event.end_time)}` : ''}`);
    text(`Completed activities: ${event.completed} of ${event.activities.length}. Recorded athletes: ${event.participants.length}. Event registrations: ${countLabel(event.registered_teams, 'team')}, ${countLabel(event.individual_entries, 'individual entry', 'individual entries')}.`);
    event.activities.forEach(activity);
    if (!event.activities.length) text('No matches or competitions recorded within the selected dates.');
    if (includePhotos) {
      if (!event.photos.length) { heading('Event photos'); text('No photos linked to this event.'); }
      for (const [photoIndex, photo] of event.photos.entries()) {
        const image = await loadPhoto(photo);
        const imageWidth = Math.min(width, 100 / image.ratio), imageHeight = imageWidth * image.ratio;
        room(imageHeight + 35);
        if (photoIndex === 0) heading('Event photos');
        pdf.addImage(image.data, 'JPEG', left, y, imageWidth, imageHeight); y += imageHeight + 5;
        text(photo.title, 10, true);
        if (photo.caption) text(photo.caption);
      }
    }
  }
  if (report.otherActivities.length) { heading('Other matches and competitions'); report.otherActivities.forEach(activity); }
  heading('Director of Physical Education');
  text(`Generated: ${reportDate(report.generatedAt)}`);
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFontSize(8); pdf.text(`NEC Sports Activity Report | ${page} / ${pages}`, left, 289);
  }
  pdf.save(`NEC_Sports_Activity_${report.period.from}_${report.period.to}.pdf`);
}
