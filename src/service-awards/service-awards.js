/* Native CMS reference fields supply the selected awards on every publish. */
(()=>{
  'use strict';
  if(window.__tdbServiceAwards)return;
  window.__tdbServiceAwards=true;
  function node(tag,className,text){const e=document.createElement(tag);e.className=className;if(text)e.textContent=text;return e;}
  // Home uses the practice-wide trio; service pages retain their CMS selections.
  const homeRecords=[
    {image:'https://cdn.prod.website-files.com/67837ee85ee175873126e461/69d7d3cc7474d3983cd16ca0_the-dental-barns-private-dentistry-awards-2025-winner-digital-practice.svg',heading:'Digital Practice',result:'Winner · 2025',copy:'Technology that helps you understand your dental health and explore your options.',alt:'Private Dentistry Awards 2025 — Digital Practice winner'},
    {image:'https://cdn.prod.website-files.com/67837ee85ee175873126e461/69d8ba1f4ba739115efec96b_the-dental-barns-private-dentistry-awards-2025-highly-commended-patient-care.svg',heading:'Patient Care',result:'Highly Commended · 2025',copy:'Recognition for the care and attention at the heart of every visit.',alt:'Private Dentistry Awards 2025 — Patient Care highly commended'},
    {image:'https://cdn.prod.website-files.com/67837ee85ee175873126e461/69d8ba99fb2c6562c211e98b_the-dental-barns-dentistry-awards-2025-winner-practice-manager-uk.svg',heading:'Practice Manager',result:'UK & Ireland Winner · 2025',copy:'National recognition for the work behind a thoughtful patient experience.',alt:'Dentistry Awards 2025 — Practice Manager UK winner'}
  ];
  function init(){
    const feed=document.querySelector('[data-tdb-awards-feed]');
    const home=document.documentElement.dataset.wfPage==='677cf86df9952f978d94d8a9';
    if(!feed&&!home)return;
    const records=home?homeRecords:Array.from(feed.querySelectorAll('[data-tdb-award-record]')).map(r=>({
      image:r.querySelector('img')?.getAttribute('src'),
      alt:r.querySelector('img')?.alt,
      heading:r.querySelector('[data-award-heading]')?.textContent.trim(),
      result:r.querySelector('[data-award-result]')?.textContent.trim(),
      copy:r.querySelector('[data-award-copy]')?.textContent.trim()
    })).filter(r=>r.image&&r.heading);
    document.querySelectorAll('[data-tdb-service-awards]').forEach(root=>{
      if(root.dataset.ready)return;
      root.dataset.ready='true';
      const grid=root.querySelector('.tdb-awards-grid');
      const seen=new Set();
      records.forEach(r=>{
        if(seen.has(r.image)||seen.size>=3)return;seen.add(r.image);
        const card=node('article','tdb-award');
        const logo=node('span','tdb-award-logo');
        logo.setAttribute('role','img');logo.setAttribute('aria-label',r.alt||r.heading);
        logo.style.setProperty('--award-image',`url(${JSON.stringify(r.image)})`);
        const copy=node('div','tdb-award-text');
        copy.append(node('h3','tdb-award-title',r.heading),node('p','tdb-award-result',r.result),node('p','tdb-award-copy',r.copy));
        card.append(logo,copy);grid.append(card);const caption=copy.querySelector('.tdb-award-copy');caption.style.opacity='.5';caption.setAttribute('data-tdb-dd-page','viewport');
      });
      if(!seen.size)root.hidden=true;
    });
    window.TDBDDFades?.refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
