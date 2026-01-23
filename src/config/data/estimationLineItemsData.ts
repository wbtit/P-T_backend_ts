const lineItems = [
  {
    scopeOfWork: "Column",
    type:"MainSteel",
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Beams",
    type:"MainSteel",
    remarks: "",
    quantity: null,
    hoursPerQty: 1.25,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Curved Beam/Rolled Beam",
    type:"MainSteel", 
    remarks: "",
    quantity: null,
    hoursPerQty: 2.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Truss",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 6,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Horizontal Brace",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Vertical. Brace",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Kicker/Knee Brace",
     type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Girt & Purlin",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Lintel/Brick Veneer Supports",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Posts/Pipe",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Hangers",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Deck edge Angle / Bent plate",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1.25,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Misc. Attachments",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1.25,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Outriggers",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Sag rod",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Turn Buckle",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Dock Levellers",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 4,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "RTU Frame/Roof Hatch Frame",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Roof Drain Frame",
    type:"MainSteel",  
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Embed Plate/Bearing Plates",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 2,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Embeds Angle",
    type:"MainSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Stair",
    type:"MiscSteel",   
    remarks: "",
    quantity: null,
    hoursPerQty: 8,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Dock Stair",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 3,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Guardrail",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 2,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Handrail/Wallrails",
    type:"MiscSteel",    
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Landing Frame",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Roof Ladder",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 3,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Ship Ladder/Cage Ladder",
    type:"MiscSteel",    
    remarks: "",
    quantity: null,
    hoursPerQty: 4,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Pit Ladder",
    type:"MiscSteel",    
    remarks: "",
    quantity: null,
    hoursPerQty: 1.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Bollard",
    type:"MiscSteel",    
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Gates",
    type:"MiscSteel",    
    remarks: "",
    quantity: null,
    hoursPerQty: 6,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Grating",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Bike Rack",
    type:"MiscSteel",     
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Joist",
    type:"Others",    
    remarks: "",
    quantity: null,
    hoursPerQty: 0.5,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Wall",
    type:"Others",     
    remarks: "",
    quantity: null,
    hoursPerQty: 1,
    totalHours: 0,
    weeks: null
  },
  {
    scopeOfWork: "Other trades",
    type:"Others",      
    remarks: "",
    quantity: null,
    hoursPerQty: 0.75,
    totalHours: 0,
    weeks: null
  }
];

export default lineItems;
