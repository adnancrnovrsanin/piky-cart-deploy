import React, { useState, useCallback, useEffect } from 'react'; // Changed useEffect to useCallback
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {
  X,
  Camera,
  Image as ImageIcon,
  Type,
  Sparkles,
  Loader,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';

// Define the schema for shopping list items, mirroring the backend
const ShoppingListSchemaFrontend = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      quantity_unit: z.string().optional(),
      category: z.string(),
      brand: z.string().optional(),
    })
  ),
});

interface EasyInputModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (
    items: Array<{ name: string; quantity: number; category: string; brand?: string; quantity_unit?: string }>
  ) => void;
  isCreatingList?: boolean;
}

type InputMode = 'text' | 'image';

// Moved sub-components outside EasyInputModal for performance and clarity

interface ModeSelectorProps {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  styles: any; // Ideally, use a more specific type for styles
}

const ModeSelector = React.memo(
  ({ inputMode, onModeChange, styles }: ModeSelectorProps) => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          inputMode === 'text' && styles.modeButtonActive,
        ]}
        onPress={() => onModeChange('text')}
      >
        <Type size={20} color={inputMode === 'text' ? '#8B5CF6' : '#6B7280'} />
        <Text
          style={[
            styles.modeButtonText,
            inputMode === 'text' && styles.modeButtonTextActive,
          ]}
        >
          Text
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modeButton,
          inputMode === 'image' && styles.modeButtonActive,
        ]}
        onPress={() => onModeChange('image')}
      >
        <ImageIcon
          size={20}
          color={inputMode === 'image' ? '#8B5CF6' : '#6B7280'}
        />
        <Text
          style={[
            styles.modeButtonText,
            inputMode === 'image' && styles.modeButtonTextActive,
          ]}
        >
          Photo
        </Text>
      </TouchableOpacity>
    </View>
  )
);

interface TextInputComponentProps {
  textInput: string;
  onTextInputChange: (text: string) => void;
  styles: any;
}

const TextInputComponent = React.memo(
  ({ textInput, onTextInputChange, styles }: TextInputComponentProps) => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Describe your shopping list</Text>
      <Text style={styles.sectionSubtitle}>
        Type naturally - AI will extract items, quantities with units, categories, and brands
      </Text>

      <TextInput
        style={styles.textArea}
        placeholder="e.g., 2 kg ground beef, 1L Coca-Cola, 500g organic flour, 1 dozen eggs, 2 packs Nike socks, 3 heads lettuce..."
        value={textInput}
        onChangeText={onTextInputChange}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        placeholderTextColor="#9CA3AF"
        autoFocus
      />

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Examples with units:</Text>
        <Text style={styles.exampleText}>• "2 kg Tyson chicken breast, 1L Horizon organic milk"</Text>
        <Text style={styles.exampleText}>
          • "500g all-purpose flour, 2 dozen free-range eggs"
        </Text>
        <Text style={styles.exampleText}>
          • "3 packs Orbit gum, 1 box Cheerios cereal, 2L spring water"
        </Text>
        <Text style={styles.exampleText}>
          • "1 head romaine lettuce, 2 bunches organic bananas"
        </Text>
      </View>
    </View>
  )
);

interface ImageInputComponentProps {
  selectedImage: string | null;
  onSetSelectedImage: (image: string | null) => void;
  onPickImage: (source: 'camera' | 'library') => Promise<void>;
  styles: any;
}

const ImageInputComponent = React.memo(
  ({
    selectedImage,
    onSetSelectedImage,
    onPickImage,
    styles,
  }: ImageInputComponentProps) => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Upload a photo</Text>
      <Text style={styles.sectionSubtitle}>
        Take a photo or upload an image of a receipt, handwritten list, or menu. AI will extract quantities with units and brands when visible.
      </Text>

      {selectedImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => onSetSelectedImage(null)}
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={() => onPickImage('camera')}
          >
            <Camera size={32} color="#8B5CF6" />
            <Text style={styles.imagePickerButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={() => onPickImage('library')}
          >
            <ImageIcon size={32} color="#8B5CF6" />
            <Text style={styles.imagePickerButtonText}>
              Choose from Library
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Works with:</Text>
        <Text style={styles.exampleText}>• Shopping receipts (extracts quantities, units, and brands)</Text>
        <Text style={styles.exampleText}>• Handwritten lists (recognizes units like "2kg", "1L")</Text>
        <Text style={styles.exampleText}>• Restaurant menus (portion sizes and ingredients)</Text>
        <Text style={styles.exampleText}>• Recipe ingredients with measurements and brand preferences</Text>
      </View>
    </View>
  )
);

const EasyInputModal = React.memo(
  ({
    visible,
    onClose,
    onComplete,
    isCreatingList = false,
  }: EasyInputModalProps) => {
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [textInput, setTextInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const resetModal = useCallback(() => {
      setInputMode('text');
      setTextInput('');
      setSelectedImage(null);
    }, []);

    const handleClose = useCallback(() => {
      resetModal();
      onClose();
    }, [onClose, resetModal]);


    const pickImage = useCallback(async (source: 'camera' | 'library') => {
      try {
        let result;
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'], // Use the string literal 'images' in an array (lowercase)
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        };

        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission needed',
              'Camera permission is required to take photos.'
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync(options);
        } else {
          result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          if (asset.base64) {
            setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
          }
        }
      } catch (error) {
        console.error('Error picking image:', error);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      }
    }, []);

    const handleSubmit = useCallback(async () => {
      if (inputMode === 'text' && !textInput.trim()) {
        Alert.alert(
          'Input Required',
          'Please enter some text describing your shopping list.'
        );
        return;
      }

      if (inputMode === 'image' && !selectedImage) {
        Alert.alert('Image Required', 'Please select an image to process.');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const payload = {
          type: inputMode,
          content: inputMode === 'text' ? textInput.trim() : selectedImage,
        };

        const response = await fetch('/api/parse-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('API response:', JSON.stringify(result, null, 2));
        
        // Validate the response with Zod
        const parsed = ShoppingListSchemaFrontend.safeParse(result);
        if (!parsed.success) {
          throw new Error('Invalid response structure');
        }

        if (parsed.data.items.length > 0) {
          console.log('Calling onComplete with items:', parsed.data.items);
          onComplete(parsed.data.items);
          resetModal();
          onClose();
        } else {
          console.warn('API returned empty items array');
          Alert.alert(
            'No Items Found',
            'No items could be extracted from your input. Please try again with different content.'
          );
        }
      } catch (err) {
        console.error('Error processing input:', err);
        setError(err as Error);
        Alert.alert(
          'Error',
          'Failed to process your input. Please check your internet connection and try again.'
        );
      } finally {
        setIsLoading(false);
      }
    }, [inputMode, textInput, selectedImage, onComplete, resetModal, onClose]);

    // Pass styles to sub-components if they don't have access to the styles object from module scope
    // For this example, assuming styles object is defined below and accessible.
    // If not, pass styles as a prop: styles={styles}

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback
          onPress={Platform.OS === 'web' ? undefined : () => Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Adjusted offset
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isLoading} // Disable close if processing
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Smart Add Items</Text>
                <View style={{ width: 24 }} /> {/* Spacer */}
              </View>

              <ModeSelector
                inputMode={inputMode}
                onModeChange={setInputMode}
                styles={styles}
              />

              <ScrollView
                style={{ flex: 1 }} // Ensure ScrollView can expand
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled" // Helps with taps inside ScrollView when keyboard is up
              >
                {inputMode === 'text' ? (
                  <TextInputComponent
                    textInput={textInput}
                    onTextInputChange={setTextInput}
                    styles={styles}
                  />
                ) : (
                  <ImageInputComponent
                    selectedImage={selectedImage}
                    onSetSelectedImage={setSelectedImage}
                    onPickImage={pickImage}
                    styles={styles}
                  />
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader
                      size={20}
                      color="#FFFFFF"
                      style={styles.loaderIcon}
                    />
                  ) : (
                    <Sparkles
                      size={20}
                      color="#FFFFFF"
                      style={styles.submitIcon}
                    />
                  )}
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Processing...' : 'Extract Items'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'web' ? '90%' : '95%',
    minHeight: Platform.OS === 'web' ? '70%' : '80%', // Consider if this minHeight is too large with keyboard
    display: 'flex', // Added to help with flex children like ScrollView
    flexDirection: 'column', // Ensure children are laid out vertically
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loaderIcon: {
    marginRight: 8,
  },
  submitIcon: {
    marginRight: 8,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    // borderRadius: 12, // This style was causing a visual bug with the active state
    marginHorizontal: 16, // Added to align with padding
    marginTop: 16, // Added for spacing
    marginBottom: 16, // Adjusted from 24
    borderRadius: 8, // Added for consistency
    overflow: 'hidden', // Ensure child borderRadius is respected
    padding: 4, // Keep padding if it's for the internal buttons
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#F3F4F6',
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  modeButtonTextActive: {
    color: '#8B5CF6',
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: Platform.OS === 'ios' ? 120 : 100, // Adjusted minHeight for Android
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  imagePickerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingVertical: 32,
  },
  imagePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  examplesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  examplesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default EasyInputModal;