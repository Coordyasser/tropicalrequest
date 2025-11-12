import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLogoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    const uploadLogo = async () => {
      try {
        // Check if logo already exists
        const { data: existingFiles } = await supabase
          .storage
          .from('imagem')
          .list('', {
            search: 'tropical_vetor.png'
          });

        if (existingFiles && existingFiles.length > 0) {
          setUploadComplete(true);
          return;
        }

        setIsUploading(true);

        // Fetch logo from public folder
        const response = await fetch('/tropical_vetor.png');
        const blob = await response.blob();

        // Upload to storage
        const { error } = await supabase
          .storage
          .from('imagem')
          .upload('tropical_vetor.png', blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (error) {
          console.error('Error uploading logo:', error);
        } else {
          setUploadComplete(true);
        }
      } catch (error) {
        console.error('Error in logo upload:', error);
      } finally {
        setIsUploading(false);
      }
    };

    uploadLogo();
  }, []);

  return { isUploading, uploadComplete };
};
