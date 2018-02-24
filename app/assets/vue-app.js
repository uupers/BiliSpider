var vm = new Vue({
el: '#data-html',
data: {
   stats: []
   },
   mounted: function () {
      this.execplot();
   },
   methods: {
      execplot: function (){
         plot(this.energy, this.masssquared,this.mixangle,this.initstate,0, this.endpoint, 10000)
      }

   },
   computed: {

   }
})