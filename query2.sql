SELECT bri.id, bri."requestId", bri."assetId", bri."itemStatus", a."assetName", a."assetCode" FROM borrow_request_items bri JOIN assets a ON a.id = bri."assetId" WHERE bri."requestId" = 4;
