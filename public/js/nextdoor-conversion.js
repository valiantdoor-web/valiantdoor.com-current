(function(){
  'use strict';
  var params=new URLSearchParams(location.search);var clickId=params.get('ndclid');
  if(clickId){try{localStorage.setItem('valiant_nextdoor_click_id',clickId)}catch(e){}}
  var selected='unspecified';
  function emit(name,kind){
    window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,service_problem:selected,traffic_source:'nextdoor'});
    if(typeof window.ndp==='function')window.ndp('track','initiate_checkout',{content_name:selected,cta_kind:kind});
  }
  function refreshBooking(){document.querySelectorAll('.track-book').forEach(function(a){var url=new URL(a.dataset.baseBooking);url.searchParams.set('utm_source','nextdoor');url.searchParams.set('utm_medium','paid_social');url.searchParams.set('utm_campaign','emergency_repair');url.searchParams.set('utm_content',selected);if(clickId)url.searchParams.set('ndclid',clickId);a.href=url.toString()})}
  document.querySelectorAll('[data-problem]').forEach(function(button){button.addEventListener('click',function(){selected=button.dataset.problem;document.querySelectorAll('[data-problem]').forEach(function(b){b.classList.toggle('selected',b===button)});document.getElementById('selection').textContent='Selected: '+button.querySelector('strong').textContent+'. This will be included in your booking link.';refreshBooking();window.dataLayer.push({event:'nextdoor_problem_selected',service_problem:selected})})});
  document.querySelectorAll('.track-call').forEach(function(a){a.addEventListener('click',function(){emit('nextdoor_call_click','phone')})});
  document.querySelectorAll('.track-book').forEach(function(a){a.addEventListener('click',function(){emit('nextdoor_booking_click','booking')})});
  refreshBooking();
})();
