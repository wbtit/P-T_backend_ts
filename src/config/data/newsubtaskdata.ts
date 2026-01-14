const newSubTasks = [
  {
    wbsactivityID: "0306b314-a815-48d0-a46e-2289a1b41158",
    description: "Create 1st horizontal & vertical grid line",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "gridPlacement-first"
  },
  {
    wbsactivityID: "0306b314-a815-48d0-a46e-2289a1b41158",
    description: "Straight grid Line",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "gridPlacement-straight"
  },
  {
    wbsactivityID: "0306b314-a815-48d0-a46e-2289a1b41158",
    description: "Inclined Grid Line",
    unitTime: 4,
    CheckUnitTime: 1.3,
    wbsTemplateKey: "gridPlacement-inclined"
  },
  {
    wbsactivityID: "0306b314-a815-48d0-a46e-2289a1b41158",
    description: "Circular Grid Line",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "gridPlacement-circular"
  },
  {
    wbsactivityID: "9d61abba-b882-4a63-9c4c-2f2ff2469d82",
    description: "Wall Placement (If required)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpWallPanelPlacement-first"
  },
  {
    wbsactivityID: "9d61abba-b882-4a63-9c4c-2f2ff2469d82",
    description: "Panel Placement (If required)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpWallPanelPlacement-second"
  },
  {
    wbsactivityID: "483f3643-140e-4a57-9991-742a7063de3f",
    description: "Straight",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpColumnPlacement-first"
  },
  {
    wbsactivityID: "483f3643-140e-4a57-9991-742a7063de3f",
    description: "Inclined",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpColumnPlacement-second"
  },
  {
    wbsactivityID: "483f3643-140e-4a57-9991-742a7063de3f",
    description: "Built up",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpColumnPlacement-third"
  },
  {
    wbsactivityID: "483f3643-140e-4a57-9991-742a7063de3f",
    description: "New Profile Add",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpColumnPlacement-fourth"
  },
  {
    wbsactivityID: "2d4d31b4-7f7e-48bf-89dd-2da53fe62e1a",
    description: "Plate Definition Schedule(Standard Pattern)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpBasePlate-first"
  },
  {
    wbsactivityID: "2d4d31b4-7f7e-48bf-89dd-2da53fe62e1a",
    description: "Plate Definition Schedule(Non-standard Pattern)",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "mpBasePlate-second"
  },
  {
    wbsactivityID: "2d4d31b4-7f7e-48bf-89dd-2da53fe62e1a",
    description: "Apply Base Plate",
    unitTime: 1,
    CheckUnitTime: 0.3,
    wbsTemplateKey: "mpBasePlate-three"
  },
  {
    wbsactivityID: "a2cae691-5a64-49ad-8cfd-e11cedf07e61",
    description: "Anchor Bolt Setting Details",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "detailingOfAbPlans-first"
  },
  {
    wbsactivityID: "a2cae691-5a64-49ad-8cfd-e11cedf07e61",
    description: "Anchor Bolt Detailing",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "detailingOfAbPlans-second"
  },
  {
    wbsactivityID: "a2cae691-5a64-49ad-8cfd-e11cedf07e61",
    description: "Template/ Leveling Plate detailing",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "detailingOfAbPlans-third"
  },
  {
    wbsactivityID: "a2cae691-5a64-49ad-8cfd-e11cedf07e61",
    description: "Sheet loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "detailingOfAbPlans-fourth"
  },
  {
    wbsactivityID: "003c5d0d-fcf0-407b-be3e-8fe9109b8244",
    description: "Straight",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpBeamPlacement-first"
  },
  {
    wbsactivityID: "003c5d0d-fcf0-407b-be3e-8fe9109b8244",
    description: "Other Type",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpBeamPlacement-second"
  },
  {
    wbsactivityID: "4de77ed2-b856-450c-b6f2-adc088155a0c",
    description: "Simple",
    unitTime: 1,
    CheckUnitTime: 0.3,
    wbsTemplateKey: "mpJoistPlacement-first"
  },
  {
    wbsactivityID: "4de77ed2-b856-450c-b6f2-adc088155a0c",
    description: "Complex (Sloped)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpJoistPlacement-second"
  },
  {
    wbsactivityID: "b919dd6d-2de1-4423-89f8-cb10589049dd",
    description: "Straight Lintel Placement",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpLintel-first"
  },
  {
    wbsactivityID: "b919dd6d-2de1-4423-89f8-cb10589049dd",
    description: "Curved Lintel Placement",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "mpLintel-second"
  },
  {
    wbsactivityID: "b919dd6d-2de1-4423-89f8-cb10589049dd",
    description: "New Profile Add",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpLintel-third"
  },
  {
    wbsactivityID: "3607ef39-bbd7-4d41-be71-2397f6921cf3",
    description: "Lintel Embeds/ Bearing Plate",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpEmbedPlacement-first"
  },
  {
    wbsactivityID: "3607ef39-bbd7-4d41-be71-2397f6921cf3",
    description: "Deck Support Angle",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpEmbedPlacement-4"
  },
  {
    wbsactivityID: "3607ef39-bbd7-4d41-be71-2397f6921cf3",
    description: "Beam Embeds/ Bearing Plate",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpEmbedPlacement-second"
  },
  {
    wbsactivityID: "3607ef39-bbd7-4d41-be71-2397f6921cf3",
    description: "Joist Embeds/ Bearing Plate",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpEmbedPlacement-third"
  },
  {
    wbsactivityID: "c89c2ff8-ffd5-40dd-bb5a-32c7c433f658",
    description: "Deck Support Angle",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "deckSupportAngle"
  },
  {
    wbsactivityID: "3607ef39-bbd7-4d41-be71-2397f6921cf3",
    description: "Panel Embed",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpEmbedPlacement-fourth"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Slab Embed/ Bearing Plate - Plan Generation - Complex",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "erectionOfEmbedPlans-1"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Slab Embed/ Bearing Plate - Plan Generation - Moderate",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfEmbedPlans-2"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Slab Embed/ Bearing Plate - Plan Generation - Simple",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfEmbedPlans-3"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Slab Embed/ Bearing Plate - Sheet loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "erectionOfEmbedPlans-4"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Panel/ Wall Embed/ Bearing Plate - Embed/ Bearing Plate Plan Generation - Complex",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "erectionOfEmbedPlans-5"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Panel/ Wall Embed/ Bearing Plate - Embed/ Bearing Plate Plan Generation - Moderate",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfEmbedPlans-6"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Panel/ Wall Embed/ Bearing Plate - Embed/ Bearing Plate Plan Generation - Simple",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfEmbedPlans-7"
  },
  {
    wbsactivityID: "0c466582-5522-4314-ad06-88f5b5c9edd1",
    description: "Sheet loading",
    unitTime: 5,
    CheckUnitTime: 0,

    wbsTemplateKey: "erectionOfEmbedPlans-8"
  },
  {
    wbsactivityID: "dca39942-7aa7-4d33-9126-7987cfdb1496",
    description: "Horizontal Girt Placement",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpGirtPurlinPlacement-1"
  },
  {
    wbsactivityID: "dca39942-7aa7-4d33-9126-7987cfdb1496",
    description: "Inclined Girt Placement",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpGirtPurlinPlacement-2"
  },
  {
    wbsactivityID: "dca39942-7aa7-4d33-9126-7987cfdb1496",
    description: "Purlin Placement",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpGirtPurlinPlacement-3"
  },
  {
    wbsactivityID: "dca39942-7aa7-4d33-9126-7987cfdb1496",
    description: "New Profile Add",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpGirtPurlinPlacement-4"
  },
  {
    wbsactivityID: "7850b927-7a8d-4714-9bd4-536778356991",
    description: "Jamb Placement",
    unitTime: 4,
    CheckUnitTime: 1.3,
    wbsTemplateKey: "mpJambHeaderPlacement-1"
  },
  {
    wbsactivityID: "7850b927-7a8d-4714-9bd4-536778356991",
    description: "Header Placement",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpJambHeaderPlacement-2"
  },
  {
    wbsactivityID: "7850b927-7a8d-4714-9bd4-536778356991",
    description: "New Profile Add",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpJambHeaderPlacement-3"
  },
  {
    wbsactivityID: "6113f3fa-a0b2-4899-8ce7-2312657be798",
    description: "Brace Placement Horizontal",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpBracePlacement-1"
  },
  {
    wbsactivityID: "6113f3fa-a0b2-4899-8ce7-2312657be798",
    description: "Brace Placement Vertical",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpBracePlacement-2"
  },
  {
    wbsactivityID: "6113f3fa-a0b2-4899-8ce7-2312657be798",
    description: "HB Sloped",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpBracePlacement-3"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "Truss Placement Horizontal Top/ Bottom Chord",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpTrussPlacement-1"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "Truss Placement Sloped Top/ Bottom Chord",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpTrussPlacement-2"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "Truss Placement Curved Top/ Bottom Chord",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpTrussPlacement-3"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "Truss Placement Diagonal Members",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpTrussPlacement-4"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "Truss Placement Vertical Members",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpTrussPlacement-5"
  },
  {
    wbsactivityID: "dfcdf2e5-e307-4ecc-9e2c-fe8622eab1c4",
    description: "New Profile Add",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpTrussPlacement-6"
  },
  {
    wbsactivityID: "2f3f9309-47d7-48d9-8130-de2004bad864",
    description: "Horizontal Sag Rod Placement",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpSagRodPlacement-1"
  },
  {
    wbsactivityID: "2f3f9309-47d7-48d9-8130-de2004bad864",
    description: "Vertical Sag Rod Placement",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpSagRodPlacement-2"
  },
  {
    wbsactivityID: "2f3f9309-47d7-48d9-8130-de2004bad864",
    description: "Inclined Sag Rod Placement",
    unitTime: 4,
    CheckUnitTime: 1.3,
    wbsTemplateKey: "mpSagRodPlacement-3"
  },
  {
    wbsactivityID: "af26ac6b-bd54-487a-8278-774bfc1facb9",
    description: "Cap Plate",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfColumn-1"
  },
  {
    wbsactivityID: "af26ac6b-bd54-487a-8278-774bfc1facb9",
    description: "Base Stiffener PL",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfColumn-2"
  },
  {
    wbsactivityID: "af26ac6b-bd54-487a-8278-774bfc1facb9",
    description: "Splice",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "connectionOfColumn-3"
  },
  {
    wbsactivityID: "af26ac6b-bd54-487a-8278-774bfc1facb9",
    description: "Base Pl for Post/ Stub",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "connectionOfColumn-4"
  },
  {
    wbsactivityID: "af26ac6b-bd54-487a-8278-774bfc1facb9",
    description: "OSHA Requirement (Safety Cable, lifting Hole etc.)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfColumn-5"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Beam Auto Standard Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBeam1"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Beam User Defined Connection - Shear Connection",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "connectionOfBeam2"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Beam User Defined Connection - Moment Connection",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "connectionOfBeam3"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Splice Connection",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "connectionOfBeam4"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Stiffener Add",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBeam5"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Wing/ Haunch/ Web Extension Pl",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBeam6"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "Reinforcement Plate",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBeam7"
  },
  {
    wbsactivityID: "903c7cc5-1853-46b0-89e6-1b44b2aa67f5",
    description: "OSHA Requirement",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBeam8"
  },
  {
    wbsactivityID: "5949e0c6-c106-4ea4-b6b0-da58bf6edfda",
    description: "Jamb Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfJambAndHeader1"
  },
  {
    wbsactivityID: "5949e0c6-c106-4ea4-b6b0-da58bf6edfda",
    description: "Header Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfJambAndHeader2"
  },
  {
    wbsactivityID: "84d40727-a227-44af-b391-6f9801053280",
    description: "Horizontal Brace Connection",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "connectionOfBrace1"
  },
  {
    wbsactivityID: "84d40727-a227-44af-b391-6f9801053280",
    description: "Vertical Brace Connection",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "connectionOfBrace2"
  },
  {
    wbsactivityID: "84d40727-a227-44af-b391-6f9801053280",
    description: "Spacer Plate (Double Angle/ X-Bracing)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfBrace3"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Horizontal Top & Bottom Chord - Splice Connection",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "connectionOfTruss1"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Horizontal Top & Bottom Chord - End Connection- Moment",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "connectionOfTruss2"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Horizontal Top & Bottom Chord - End Connection- Shear",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfTruss3"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Sloped Top & Bottom Chord - Splice Connection",
    unitTime: 20,
    CheckUnitTime: 6.7,
    wbsTemplateKey: "connectionOfTruss4"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Sloped Top & Bottom Chord - End Connection- Moment",
    unitTime: 25,
    CheckUnitTime: 8.3,
    wbsTemplateKey: "connectionOfTruss5"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Sloped Top & Bottom Chord - End Connection- Shear",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "connectionOfTruss6"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Curved Top & Bottom Chord - Splice Connection",
    unitTime: 20,
    CheckUnitTime: 6.7,
    wbsTemplateKey: "connectionOfTruss7"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Curved Top & Bottom Chord - End Connection- Moment",
    unitTime: 25,
    CheckUnitTime: 8.3,
    wbsTemplateKey: "connectionOfTruss8"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Curved Top & Bottom Chord - End Connection- Shear",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "connectionOfTruss9"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Diagonal Members",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "connectionOfTruss10"
  },
  {
    wbsactivityID: "5a4afc6f-d993-4633-872b-17c4bbc5178b",
    description: "Vertical Members",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "connectionOfTruss11"
  },
  {
    wbsactivityID: "881e722c-eea3-43ea-80ef-3f32fe32f7b8",
    description: "Horizontal Girt Connection",
    unitTime: 4,
    CheckUnitTime: 1.3,
    wbsTemplateKey: "connectionOfGirtAndPurlin1"
  },
  {
    wbsactivityID: "881e722c-eea3-43ea-80ef-3f32fe32f7b8",
    description: "Purlin Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfGirtAndPurlin2"
  },
  {
    wbsactivityID: "881e722c-eea3-43ea-80ef-3f32fe32f7b8",
    description: "Inclined Girt Connection",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "connectionOfGirtAndPurlin3"
  },
  {
    wbsactivityID: "4bd20527-299f-413d-88ef-33eab517153f",
    description: "Connection with Column",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfJoist1"
  },
  {
    wbsactivityID: "4bd20527-299f-413d-88ef-33eab517153f",
    description: "Connection with Beam",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfJoist2"
  },
  {
    wbsactivityID: "4bd20527-299f-413d-88ef-33eab517153f",
    description: "OSHA Requirement",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "connectionOfJoist3"
  },
  {
    wbsactivityID: "d9961d49-24c6-4e64-8413-cd4b3d860084",
    description: "Simple Column Detailing",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "columnDetailing1"
  },
  {
    wbsactivityID: "d9961d49-24c6-4e64-8413-cd4b3d860084",
    description: "Moderate Column Detailing",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "columnDetailing2"
  },
  {
    wbsactivityID: "d9961d49-24c6-4e64-8413-cd4b3d860084",
    description: "Complex Column Detailing",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "columnDetailing3"
  },
  {
    wbsactivityID: "d9961d49-24c6-4e64-8413-cd4b3d860084",
    description: "Most Complex Column Detailing",
    unitTime: 20,
    CheckUnitTime: 6.7,
    wbsTemplateKey: "columnDetailing4"
  },
  {
    wbsactivityID: "7efbefff-ef0c-4960-9719-b866b3f8c882",
    description: "Simple Beam Detailing",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "beamDetailing1"
  },
  {
    wbsactivityID: "7efbefff-ef0c-4960-9719-b866b3f8c882",
    description: "Moderate Beam Detailing",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "beamDetailing2"
  },
  {
    wbsactivityID: "7efbefff-ef0c-4960-9719-b866b3f8c882",
    description: "Complex Beam Detailing",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "beamDetailing3"
  },
  {
    wbsactivityID: "7efbefff-ef0c-4960-9719-b866b3f8c882",
    description: "Most Complex Beam Detailing",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "beamDetailing4"
  },
  {
    wbsactivityID: "ac6f620a-3435-42a0-9773-a745dfef3932",
    description: "Simple Lintel",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "lintelDetailing1"
  },
  {
    wbsactivityID: "ac6f620a-3435-42a0-9773-a745dfef3932",
    description: "Moderate Lintel",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "lintelDetailing2"
  },
  {
    wbsactivityID: "ac6f620a-3435-42a0-9773-a745dfef3932",
    description: "Complex Lintel",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "lintelDetailing3"
  },
  {
    wbsactivityID: "e40d0b97-fd4b-44a8-b561-5841f62a6f3a",
    description: "Simple Jamb",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "jamb1"
  },
  {
    wbsactivityID: "e40d0b97-fd4b-44a8-b561-5841f62a6f3a",
    description: "Moderate Jamb",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "jamb2"
  },
  {
    wbsactivityID: "e40d0b97-fd4b-44a8-b561-5841f62a6f3a",
    description: "Complex Jamb",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "jamb3"
  },
  {
    wbsactivityID: "e40d0b97-fd4b-44a8-b561-5841f62a6f3a",
    description: "Most Complex Jamb",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "jamb4"
  },
  {
    wbsactivityID: "bff82bbd-1c61-4904-87a4-5bfce85978fa",
    description: "Simple Header",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "header1"
  },
  {
    wbsactivityID: "bff82bbd-1c61-4904-87a4-5bfce85978fa",
    description: "Moderate Header",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "header2"
  },
  {
    wbsactivityID: "bff82bbd-1c61-4904-87a4-5bfce85978fa",
    description: "Complex Header",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "header3"
  },
  {
    wbsactivityID: "bff82bbd-1c61-4904-87a4-5bfce85978fa",
    description: "Most Complex Header",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "header4"
  },
  {
    wbsactivityID: "e2cef9eb-a94c-445b-89f0-97535f8ae0bf",
    description: "Simple Horizontal Brace",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "horizontalBrace1"
  },
  {
    wbsactivityID: "e2cef9eb-a94c-445b-89f0-97535f8ae0bf",
    description: "Moderate Horizontal Brace",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "horizontalBrace2"
  },
  {
    wbsactivityID: "e2cef9eb-a94c-445b-89f0-97535f8ae0bf",
    description: "Complex Horizontal Brace",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "horizontalBrace3"
  },
  {
    wbsactivityID: "c6d33a0b-2769-43a5-8050-6513e925b19f",
    description: "Simple Vertical Brace",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "verticalBrace1"
  },
  {
    wbsactivityID: "c6d33a0b-2769-43a5-8050-6513e925b19f",
    description: "Moderate Vertical Brace",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "verticalBrace2"
  },
  {
    wbsactivityID: "c6d33a0b-2769-43a5-8050-6513e925b19f",
    description: "Complex Vertical Brace",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "verticalBrace3"
  },
  {
    wbsactivityID: "1ea14708-13c5-4c46-8a48-23c720db7436",
    description: "Simple Girt",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "girt1"
  },
  {
    wbsactivityID: "1ea14708-13c5-4c46-8a48-23c720db7436",
    description: "Moderate Girt",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "girt2"
  },
  {
    wbsactivityID: "1ea14708-13c5-4c46-8a48-23c720db7436",
    description: "Complex Girt",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "girt3"
  },
  {
    wbsactivityID: "558a842a-c3ed-44c6-9ed1-06c1e9dcae91",
    description: "Simple Sag Rod",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "sagRod1"
  },
  {
    wbsactivityID: "558a842a-c3ed-44c6-9ed1-06c1e9dcae91",
    description: "Moderate Sag Rod",
    unitTime: 6,
    CheckUnitTime: 2,
    wbsTemplateKey: "sagRod2"
  },
  {
    wbsactivityID: "558a842a-c3ed-44c6-9ed1-06c1e9dcae91",
    description: "Complex Sag Rod",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "sagRod3"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Input as plate(Plain)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement1"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: " Input as plate(Curved)",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement2"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Input as Plate (With Cut & Notch)",
    unitTime: 6,
    CheckUnitTime: 2,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement3"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Input as grating (Plain)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement4"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Input as grating(Curved)",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement5"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Input as grating(With Cut & Notch)",
    unitTime: 6,
    CheckUnitTime: 2,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement6"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: " Checkered Plate(Plain)",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement7"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: " Checkered Plate(Curved)",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement8"
  },
  {
    wbsactivityID: "141141f4-6cda-4d0d-887b-40b3ca886175",
    description: "Checkered Plate(With Cut & Notch)",
    unitTime: 6,
    CheckUnitTime: 2,
    wbsTemplateKey: "mpGratingCheckeredPlatePlacement9"
  },
  {
    wbsactivityID: "31cb285d-2c13-402a-8710-f2b274a8cc64",
    description: "Pour Stop",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpMaterialAttachment1"
  },
  {
    wbsactivityID: "31cb285d-2c13-402a-8710-f2b274a8cc64",
    description: "Outrigger",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpMaterialAttachment2"
  },
  {
    wbsactivityID: "31cb285d-2c13-402a-8710-f2b274a8cc64",
    description: "Kicker Angle",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpMaterialAttachment3"
  },
  {
    wbsactivityID: "31cb285d-2c13-402a-8710-f2b274a8cc64",
    description: "Deck Support",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpMaterialAttachment4"
  },
  {
    wbsactivityID: "31cb285d-2c13-402a-8710-f2b274a8cc64",
    description: "Pipe Sleeve",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpMaterialAttachment5"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Shop Assembled Stair",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "mpStairPlacementConnection1"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Field Assembled Stair",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "mpStairPlacementConnection2"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Stringer Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpStairPlacementConnection3"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Beam/ HSS/ Channel",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpStairPlacementConnection4"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Horizontal Brace",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpStairPlacementConnection5"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Vertical Brace",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpStairPlacementConnection6"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Connection Beam/ HSS/ Channel",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpStairPlacementConnection7"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Connection Horizontal Brace",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpStairPlacementConnection8"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Landing Platform Connection Vertical Brace",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "mpStairPlacementConnection9"
  },
  {
    wbsactivityID: "32e1d446-2cfa-4a65-82c2-12963d272b20",
    description: "Spiral Stair",
    unitTime: 300,
    CheckUnitTime: 100,
    wbsTemplateKey: "mpStairPlacementConnection10"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Ladder without cage",
    unitTime: 45,
    CheckUnitTime: 15,
    wbsTemplateKey: "mpLadderPlacementConnection1"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Ladder with cage",
    unitTime: 100,
    CheckUnitTime: 33.3,
    wbsTemplateKey: "mpLadderPlacementConnection2"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Crossover Ladder",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "mpLadderPlacementConnection3"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Ladder connection to support & floor",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "mpLadderPlacementConnection4"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Ladder connection to platform",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "mpLadderPlacementConnection5"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Roof Hatch Ladder",
    unitTime: 100,
    CheckUnitTime: 33.3,
    wbsTemplateKey: "mpLadderPlacementConnection6"
  },
  {
    wbsactivityID: "e596e463-7ad1-4148-ae56-91d88c176033",
    description: "Safety Gate",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "mpLadderPlacementConnection7"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Pour Stop (Loose)",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpMisc1"
  },
  {
    wbsactivityID: "201ae984-60e3-4669-9f33-8560bc146170",
    description: "Loose Plate",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "loosePlate"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Deck Support Angle",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "mpMisc2"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Loose Lintel",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "mpMisc3"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Gates",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "mpMisc4"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Straight Hand Rail",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "PlacementConnection1"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Inclined Hand Rail",
    unitTime: 40,
    CheckUnitTime: 13.3,
    wbsTemplateKey: "PlacementConnection2"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Curved Hand Rail",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "PlacementConnection3"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Hand Rail Post Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "PlacementConnection4"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Guard rail Connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "PlacementConnection5"
  },
  {
    wbsactivityID: "da5ca1d6-d618-4c85-bcce-dd2ae8f1201a",
    description: "Toe Guard/ Plate",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "PlacementConnection6"
  },
  {
    wbsactivityID: "dc7096b3-7a6f-4a59-b6a6-0d0a39e731da",
    description: "RTU & opening Frame - Shop welded",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "rtuOpeningFramePlacementConnection1"
  },
  {
    wbsactivityID: "dc7096b3-7a6f-4a59-b6a6-0d0a39e731da",
    description: "RTU & opening Frame - Field Welded",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "rtuOpeningFramePlacementConnection2"
  },
  {
    wbsactivityID: "dc7096b3-7a6f-4a59-b6a6-0d0a39e731da",
    description: "Support connection",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "rtuOpeningFramePlacementConnection3"
  },
  {
    wbsactivityID: "06a12a2f-73c5-4a89-a66d-e96c8df117e3",
    description: "Plate/ Grating - Simple",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "plateGrating1"
  },
  {
    wbsactivityID: "06a12a2f-73c5-4a89-a66d-e96c8df117e3",
    description: "Plate/ Grating - Moderate",
    unitTime: 6,
    CheckUnitTime: 2,
    wbsTemplateKey: "plateGrating2"
  },
  {
    wbsactivityID: "4b0846f0-01c2-4083-8c15-e030b2f8bd3e",
    description: "Pour Stop(Loose)",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "pourStopLoose"
  },
  {
    wbsactivityID: "b9687854-21a5-4fab-bd1a-8bcaa94a9831",
    description: "Kicker",
    unitTime: 3,
    CheckUnitTime: 1,
    wbsTemplateKey: "kicker"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Loose Plate",
    unitTime: 2,
    CheckUnitTime: 0.7,
    wbsTemplateKey: "mpMisc5"
  },
  {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Bollard",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "mpMisc6"
  },
   {
    wbsactivityID: "0d265b8c-df7a-46a4-aa86-770099ee4975",
    description: "Kicker",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "mpMisc22"
  },
  {
    wbsactivityID: "4dc9c5ea-7ecd-4428-bb78-ba3a64ad99e7",
    description: "Bollard",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "bollards"
  },
  {
    wbsactivityID: "bfc75953-ae88-4170-bde6-e16cabf30c0f",
    description: "Loose Lintel",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "looseLintel"
  },
  {
    wbsactivityID: "0f5623a2-2ae0-4735-ac7e-28531d79371c",
    description: "Gates",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "gates"
  },
  {
    wbsactivityID: "9c327e3f-abba-400f-a96c-13d8f711311d",
    description: "Stair - Simple",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "stair1"
  },
  {
    wbsactivityID: "9c327e3f-abba-400f-a96c-13d8f711311d",
    description: "Stair - Moderate",
    unitTime: 40,
    CheckUnitTime: 13.3,
    wbsTemplateKey: "stair2"
  },
  {
    wbsactivityID: "9c327e3f-abba-400f-a96c-13d8f711311d",
    description: "Stair - Complex",
    unitTime: 50,
    CheckUnitTime: 16.7,
    wbsTemplateKey: "stair3"
  },
  {
    wbsactivityID: "9c327e3f-abba-400f-a96c-13d8f711311d",
    description: "Stair - Most Complex",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "stair4"
  },
  {
    wbsactivityID: "0d467b61-1d1c-48b4-9536-36b72ec397e4",
    description: "Spiral Stair",
    unitTime: 180,
    CheckUnitTime: 60,
    wbsTemplateKey: "spiralStair"
  },
  {
    wbsactivityID: "baf0dad6-35f3-43ae-8904-ce0f1679a045",
    description: "Ladder - Simple",
    unitTime: 80,
    CheckUnitTime: 26.7,
    wbsTemplateKey: "ladder1"
  },
  {
    wbsactivityID: "baf0dad6-35f3-43ae-8904-ce0f1679a045",
    description: "Ladder - Moderate",
    unitTime: 90,
    CheckUnitTime: 30,
    wbsTemplateKey: "ladder2"
  },
  {
    wbsactivityID: "baf0dad6-35f3-43ae-8904-ce0f1679a045",
    description: "Ladder - Complex",
    unitTime: 100,
    CheckUnitTime: 33.3,
    wbsTemplateKey: "ladder3"
  },
  {
    wbsactivityID: "baf0dad6-35f3-43ae-8904-ce0f1679a045",
    description: "Ladder - Most Complex",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "ladder4"
  },
  {
    wbsactivityID: "e48b0b6d-a326-443a-bd67-98e93a217e90",
    description: "Hand Rail/ Wall Rail - Simple",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "handRail1"
  },
  {
    wbsactivityID: "e48b0b6d-a326-443a-bd67-98e93a217e90",
    description: "Hand Rail/ Wall Rail - Moderate",
    unitTime: 12,
    CheckUnitTime: 4,
    wbsTemplateKey: "handRail2"
  },
  {
    wbsactivityID: "e48b0b6d-a326-443a-bd67-98e93a217e90",
    description: "Hand Rail/ Wall Rail - Complex",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "handRail3"
  },
  {
    wbsactivityID: "041d4722-72c8-46d8-a4cf-1f2f8e324c2c",
    description: "RTU & opening Frame - Simple",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "rtuOpeningFrame1"
  },
  {
    wbsactivityID: "041d4722-72c8-46d8-a4cf-1f2f8e324c2c",
    description: "RTU & opening Frame - Moderate",
    unitTime: 8,
    CheckUnitTime: 2.7,
    wbsTemplateKey: "rtuOpeningFrame2"
  },
  {
    wbsactivityID: "041d4722-72c8-46d8-a4cf-1f2f8e324c2c",
    description: "RTU & opening Frame - Complex",
    unitTime: 10,
    CheckUnitTime: 3.3,
    wbsTemplateKey: "rtuOpeningFrame3"
  },
  {
    wbsactivityID: "239cf52f-f800-4bab-8a86-20f19b786ba5",
    description: "Anchor Bolt Plan Generation-Complex",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "erectionOfAbPlans1"
  },
  {
    wbsactivityID: "239cf52f-f800-4bab-8a86-20f19b786ba5",
    description: "Anchor Bolt Plan Generation-Moderate",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfAbPlans2"
  },
  {
    wbsactivityID: "239cf52f-f800-4bab-8a86-20f19b786ba5",
    description: "Anchor Bolt Plan Generation-Simple",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfAbPlans3"
  },
  {
    wbsactivityID: "239cf52f-f800-4bab-8a86-20f19b786ba5",
    description: "Anchor Bolt Setting Details",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "erectionOfAbPlans4"
  },
  {
    wbsactivityID: "7a9ff7da-ba43-4ad8-a620-3e297a006fa7",
    description: "Slab Embed/ Bearing Plate - Section Details",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "erectionOfEmbedSections1"
  },
  {
    wbsactivityID: "7a9ff7da-ba43-4ad8-a620-3e297a006fa7",
    description: "Slab Embed/ Bearing Plate - Sheet Loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "erectionOfEmbedSections2"
  },
  {
    wbsactivityID: "7a9ff7da-ba43-4ad8-a620-3e297a006fa7",
    description: "Panel/ Wall Embed/ Bearing Plate - Embed/ Bearing Plate Sections",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "erectionOfEmbedSections3"
  },
  {
    wbsactivityID: "7a9ff7da-ba43-4ad8-a620-3e297a006fa7",
    description: "Panel/ Wall Embed/ Bearing Plate - Sheet Loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "erectionOfEmbedSections4"
  },
  {
    wbsactivityID: "f6f9c87c-6ac5-4c77-9dc7-07340b66644f",
    description: "Plan - Complex",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "erectionOfMainSteelPlans1"
  },
  {
    wbsactivityID: "f6f9c87c-6ac5-4c77-9dc7-07340b66644f",
    description: "Plan - Moderate",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfMainSteelPlans2"
  },
  {
    wbsactivityID: "f6f9c87c-6ac5-4c77-9dc7-07340b66644f",
    description: "Plan - Simple",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfMainSteelPlans3"
  },
  {
    wbsactivityID: "83f574f4-ae5c-4220-8a9b-785de07d185f",
    description: "Elevation - Complex",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfMainSteelElevations1"
  },
  {
    wbsactivityID: "83f574f4-ae5c-4220-8a9b-785de07d185f",
    description: "Elevation - Moderate",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfMainSteelElevations2"
  },
  {
    wbsactivityID: "83f574f4-ae5c-4220-8a9b-785de07d185f",
    description: "Elevation - Simple",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "erectionOfMainSteelElevations3"
  },
  {
    wbsactivityID: "efc10079-31ab-4fa9-9a47-bc73a0751601",
    description: "Section",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "erectionOfMainSteelSections"
  },
  {
    wbsactivityID: "adf44ddf-c49a-459b-9b6b-ce5412f5ba4a",
    description: "Plan - Complex",
    unitTime: 240,
    CheckUnitTime: 80,
    wbsTemplateKey: "erectionOfMiscSteelPlans1"
  },
  {
    wbsactivityID: "adf44ddf-c49a-459b-9b6b-ce5412f5ba4a",
    description: "Plan - Moderate",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfMiscSteelPlans2"
  },
  {
    wbsactivityID: "adf44ddf-c49a-459b-9b6b-ce5412f5ba4a",
    description: "Plan - Simple",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfMiscSteelPlans3"
  },
  {
    wbsactivityID: "2a088f7f-f5ee-4891-8a44-a80937877dd7",
    description: "Elevation - Complex",
    unitTime: 120,
    CheckUnitTime: 40,
    wbsTemplateKey: "erectionOfMiscSteelElevations1"
  },
  {
    wbsactivityID: "2a088f7f-f5ee-4891-8a44-a80937877dd7",
    description: "Elevation - Moderate",
    unitTime: 60,
    CheckUnitTime: 20,
    wbsTemplateKey: "erectionOfMiscSteelElevations2"
  },
  {
    wbsactivityID: "2a088f7f-f5ee-4891-8a44-a80937877dd7",
    description: "Elevation - Simple",
    unitTime: 30,
    CheckUnitTime: 10,
    wbsTemplateKey: "erectionOfMiscSteelElevations3"
  },
  {
    wbsactivityID: "18c24139-164e-408d-858e-26feb9dbade7",
    description: "Section",
    unitTime: 15,
    CheckUnitTime: 5,
    wbsTemplateKey: "erectionOfMiscSteelSections"
  },
  {
    wbsactivityID: "163fb0b7-5a6c-49f8-a976-e076a66ba9c7",
    description: "Slab Embed/ Bearing Plate - Embed/ Bearing Plate Detailing",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "embedDetailing1"
  },
  {
    wbsactivityID: "163fb0b7-5a6c-49f8-a976-e076a66ba9c7",
    description: "Slab Embed/ Bearing Plate - Sheet Loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "embedDetailing2"
  },
  {
    wbsactivityID: "163fb0b7-5a6c-49f8-a976-e076a66ba9c7",
    description: "Panel/ Wall Embed/ Bearing Plate - Embed/ Bearing Plate Detailing",
    unitTime: 5,
    CheckUnitTime: 1.7,
    wbsTemplateKey: "embedDetailing3"
  },
  {
    wbsactivityID: "163fb0b7-5a6c-49f8-a976-e076a66ba9c7",
    description: "Panel/ Wall Embed/ Bearing Plate - Sheet Loading",
    unitTime: 5,
    CheckUnitTime: 0,
    wbsTemplateKey: "embedDetailing4"
  },
  {
    wbsactivityID: "ef4127a5-1f6d-4892-b81d-d5283462d275",
    description: "Main Steel - Sheet Loading",
    unitTime: 1,
    CheckUnitTime: 0,
    wbsTemplateKey: "mainSteelSheetLoading"
  },
  {
    wbsactivityID: "74669e0a-9c18-4871-b6e2-b6285a3a0ad1",
    description: "Misc - Sheet Loading",
    unitTime: 1,
    CheckUnitTime: 0,
    wbsTemplateKey: "miscSheetLoading"
  }
];

export default newSubTasks;
