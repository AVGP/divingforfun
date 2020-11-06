function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: {lat: 46.790174, lng: 8.253874}
  });
  fetch('/luftverbund.json').then(r => r.json()).then((stations) => {
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
