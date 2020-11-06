## Schweizer Luftverbund

With a Luftverbund key, you get a prepaid solution to filling your Scuba cylinders with Air or Nitrox.
There are a few filling stations across Switzerland and most of them are available 24/7!

Last update of the list below: November 6th, 2020.

<div id="map" style="width:100%;min-height:400px;height: 50vh"></div>
<script>
function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: {lat: 46.790174, lng: 8.253874}
  });
  fetch('/luftverbund.json').then(r => r.json()).then((stations => {
    stations.map((station) => {
      const marker = new google.maps.Marker({
        position: station.position,
        title: station.name,
        map: map
      });
      
      const info = new google.maps.InfoWindow({ content: station.info, position: station.position });
      marker.addListener('click', () => info.open(map));
      return marker;
    });
  });  
}
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBdB2jLi_PMY1o56pNbIkqClQSIHkoHtMY&callback=initMap&libraries=&v=weekly"></script>
