sed -i -e '/\/\/ --- HOMEWORK STATE ---/!b' -e ':a' -e 'N' -e '/uploadDate: new Date().toISOString()/!ba' -e 'c\
  // --- HOMEWORK STATE ---\
  const [hwTitle, setHwTitle] = useState('"''"');\
  const [hwDesc, setHwDesc] = useState('"''"');\
  const [hwSubject, setHwSubject] = useState('"''"');\
  const [hwFile, setHwFile] = useState<string | null>(null);\
  const [hwFilePreview, setHwFilePreview] = useState<string | null>(null);\
\
  const handleHwFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {\
    e.preventDefault();\
    e.stopPropagation();\
    const file = e.target.files?.[0];\
    if (!file) return;\
    try {\
      const { compressImageFile, SUPPORTED_TYPES } = await import('"'"'../lib/imageCompressor'"'"');\
      if (SUPPORTED_TYPES.includes(file.type) || file.type.startsWith('"'"'image/'"'"')) {\
        const data = await compressImageFile(file);\
        setHwFile(file.name);\
        setHwFilePreview(data);\
      } else {\
        const reader = new FileReader();\
        reader.onload = (ev) => {\
          setHwFile(file.name);\
          setHwFilePreview(ev.target?.result as string);\
        };\
        reader.readAsDataURL(file);\
      }\
    } catch (err: any) {\
      setHwFile(null);\
      setHwFilePreview(null);\
    } finally {\
      (e.target as HTMLInputElement).value = '"''"';\
    }\
  };\
\
  const handleSaveHomework = async () => {\
    if (!selectedClass || !hwTitle || !hwSubject) return;\
\
    const homeworkData: any = {\
      title: hwTitle,\
      description: hwDesc,\
      classes: [selectedClass],\
      subject: hwSubject,\
      session: '"'"'Session 1'"'"',\
      uploadDate: new Date().toISOString()\
    };\
    if (hwFile) homeworkData.fileName = hwFile;\
    if (hwFilePreview) homeworkData.fileData = hwFilePreview;\
\
    await addHomework(homeworkData);\
\
    if (hwFile && hwFilePreview) {\
      let mimeType = '"'"'application/octet-stream'"'"';\
      if (hwFilePreview.startsWith('"'"'data:'"'"')) {\
        mimeType = hwFilePreview.substring(5, hwFilePreview.indexOf('"'"';'"'"'));\
      } else if (/\\.(png|jpe?g|gif|webp|svg)$/i.test(hwFile)) {\
        mimeType = '"'"'image/jpeg'"'"';\
      }\
      await addAcademicAsset({\
        fileName: `${hwTitle} - ${hwFile}`,\
        mimeType,\
        payload: hwFilePreview,\
        subjectKey: hwSubject,\
        classId: selectedClass\
      });\
    }\
' src/pages/TeacherPortal.tsx
