class Cleaner:
    """ Data Cleaner """

    def __init__(self):
        self.raw = []
        self.data = []

    
    def hay(self,path):
        
        with open(path) as f:
            for line in f:
                self.raw.append(line)
    
    def dval(self, bgp=None,edp=None, seg=None):
        if bgp == None:
            bgp = 7
        if edp == None:
            edp = -1
        if seg == None:
            seg = 2
            
        arr = self.raw[bgp:edp:seg]
        data1 = []

        for elem in arr:
            data1.append( elem[38:-2] )
            
        for elem in data:
            self.data.append( elem.split(",") )

        for i in range(len(self.data)):
            for j in range( len(self.data[i]) ):
                self.data[i][j] = int( (self.data)[i][j] )
        
        