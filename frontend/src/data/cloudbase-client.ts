import cloudbase from "@cloudbase/js-sdk";

const ENV_ID = "resumeai-pro-d5gql4vpq34e14857";

let app: any = null;
let authReady: Promise<void> | null = null;

function getApp() {
  if (!app) {
    app = (cloudbase as any).init({ env: ENV_ID });
  }
  return app;
}

function ensureAuth(): Promise<void> {
  if (!authReady) {
    authReady = (async () => {
      const a = getApp().auth({ persistence: "local" });
      try {
        const state = await a.getLoginState();
        if (!state.isSignedIn) {
          await a.anonymousAuthProvider().signIn();
        }
      } catch {
        try {
          await a.anonymousAuthProvider().signIn();
        } catch {
        }
      }
    })();
  }
  return authReady;
}

export async function uploadFileAndGetUrl(file: File): Promise<{
  fileUrl: string;
  fileID: string;
}> {
  await ensureAuth();
  const a = getApp();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const cloudPath = `uploads/${dateStr}/${Date.now()}-${file.name}`;

  const uploadResult = await a.uploadFile({ cloudPath, filePath: file });
  const fileID = uploadResult.fileID;

  const urlResult = await a.getTempFileURL({ fileList: [fileID] });
  const fileUrl = urlResult.fileList?.[0]?.tempFileURL;
  if (!fileUrl) {
    throw new Error("获取文件下载链接失败");
  }

  return { fileUrl, fileID };
}
