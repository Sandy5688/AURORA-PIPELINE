export async function dispatch(assets: any) {
  // Mock Distribution
  return [
    {
      platform: "twitter",
      status: "delivered",
      runId: assets.runId,
      timestamp: new Date().toISOString()
    },
    {
      platform: "youtube",
      status: "delivered",
      runId: assets.runId,
      timestamp: new Date().toISOString()
    }
  ];
}
