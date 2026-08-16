import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Type as TypeIcon,
  Pencil,
  ImagePlus,
  Trash2,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  BookOpen,
  GraduationCap,
  FlaskConical,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { showAppDialog } from '@/feedback/dialog';
import { FormattedText } from '@/components/formatted-text';
import { DrawingCanvas } from '@/components/chat-tools/drawing-canvas';
import { pickImage } from '@/components/chat-tools/image-picker-action';
import {
  FREE_DEFAULT,
  blockId,
  compileForTutor,
  contextKey,
  getNotebook,
  getNotebookByKey,
  listNotebooks,
  saveNotebook,
  uid,
  type Notebook,
  type NotebookBlock,
  type NotebookContext,
} from '@/lib/notebook-store';

/**
 * The notebook: a stack of note / sketch / image blocks for solving a problem
 * step by step. With a `k` route param it opens that notebook's editor; without
 * one it shows the library of every notebook (free pages plus those bound to
 * lessons and practice questions).
 */
export default function NotebookScreen() {
  const { k } = useLocalSearchParams<{ k?: string }>();
  const [openKey, setOpenKey] = useState<string | null>(k ?? null);

  if (openKey) {
    return <NotebookEditor storageKey={openKey} onBack={() => setOpenKey(null)} />;
  }
  return <NotebookLibrary onOpen={setOpenKey} />;
}

function NotebookLibrary({ onOpen }: { onOpen: (key: string) => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const [items, setItems] = useState<Notebook[] | null>(null);

  useEffect(() => {
    void listNotebooks().then(setItems);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.surface,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
          <ArrowLeft size={20} color={theme.textSoft} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 17, color: theme.text }}>
          Notebook
        </Text>
        <TouchableOpacity
          onPress={() => onOpen(`free:${uid('nb')}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 }}
        >
          <Plus size={18} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <TouchableOpacity
          onPress={() => onOpen(contextKey(FREE_DEFAULT))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <BookOpen size={18} color={theme.accent} />
          <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: theme.text }}>
            Scratch page
          </Text>
        </TouchableOpacity>

        {items === null ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={theme.accent} />
        ) : (
          items
            .filter((nb) => nb.key !== contextKey(FREE_DEFAULT))
            .map((nb) => (
              <TouchableOpacity
                key={nb.key}
                onPress={() => onOpen(nb.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}
              >
                <ContextIcon kind={nb.context.kind} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: theme.text }}
                  >
                    {nb.title.trim() || 'Untitled'}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                    {nb.context.label ?? nb.context.kind} · {nb.blocks.length} blocks
                  </Text>
                </View>
              </TouchableOpacity>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContextIcon({ kind, color }: { kind: NotebookContext['kind']; color: string }) {
  if (kind === 'lesson') return <GraduationCap size={18} color={color} />;
  if (kind === 'practice') return <FlaskConical size={18} color={color} />;
  return <BookOpen size={18} color={color} />;
}

function NotebookEditor({ storageKey, onBack }: { storageKey: string; onBack: () => void }) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [nb, setNb] = useState<Notebook | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const sketchTargetRef = useRef<string | null>(null);

  // Load the notebook for this key (or create an empty free page for it).
  useEffect(() => {
    let alive = true;
    void getNotebookByKey(storageKey).then((found) => {
      if (!alive) return;
      if (found) {
        setNb(found);
      } else {
        const id = storageKey.split(':')[1] ?? 'default';
        void getNotebook({ kind: 'free', id }).then((fresh) => alive && setNb(fresh));
      }
    });
    return () => {
      alive = false;
    };
  }, [storageKey]);

  // Autosave, skipping the initial load.
  const loaded = useRef(false);
  useEffect(() => {
    if (!nb) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    void saveNotebook(nb);
  }, [nb]);

  const update = useCallback((fn: (blocks: NotebookBlock[]) => NotebookBlock[]) => {
    setNb((prev) => (prev ? { ...prev, blocks: fn(prev.blocks) } : prev));
  }, []);

  const addNote = () => {
    const id = blockId();
    update((b) => [...b, { id, type: 'note', text: '' }]);
    setEditingId(id);
  };

  const remove = (id: string) => {
    update((b) => b.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const move = (id: string, dir: -1 | 1) =>
    update((b) => {
      const i = b.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= b.length) return b;
      const next = [...b];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const onSketchDone = (imageUri: string) => {
    const target = sketchTargetRef.current;
    if (target) {
      update((b) => b.map((x) => (x.id === target ? { ...x, type: 'sketch', image: imageUri } : x)));
    } else {
      update((b) => [...b, { id: blockId(), type: 'sketch', image: imageUri }]);
    }
    sketchTargetRef.current = null;
    setDrawing(false);
  };

  const addImage = () => {
    showAppDialog({
      title: 'Add an image',
      message: '',
      actions: [
        { label: t('common.cancel'), variant: 'cancel' },
        {
          label: 'Take a photo',
          onPress: async () => {
            const img = await pickImage('camera');
            if (img) update((b) => [...b, { id: blockId(), type: 'image', image: img.uri, name: img.fileName }]);
          },
        },
        {
          label: 'Choose from gallery',
          onPress: async () => {
            const img = await pickImage('gallery');
            if (img) update((b) => [...b, { id: blockId(), type: 'image', image: img.uri, name: img.fileName }]);
          },
        },
      ],
    });
  };

  const discuss = () => {
    if (!nb) return;
    router.push({ pathname: '/(tabs)/ai-chat', params: { prompt: compileForTutor(nb), autoStart: '1' } });
  };

  if (!nb) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.page, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  const hasContent = nb.blocks.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.surface,
        }}
      >
        <TouchableOpacity onPress={onBack} style={{ padding: 6 }}>
          <ArrowLeft size={20} color={theme.textSoft} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: theme.text }}>
          Notebook
        </Text>
        <TouchableOpacity
          onPress={discuss}
          disabled={!hasContent}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            height: 34,
            borderRadius: 10,
            backgroundColor: hasContent ? theme.accentStrong : theme.accentDisabled,
          }}
        >
          <MessageCircle size={14} color={theme.textInverse} />
          <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 12.5, color: theme.textInverse }}>
            Ask Sensei
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={nb.title}
          onChangeText={(title) => setNb((prev) => (prev ? { ...prev, title } : prev))}
          placeholder="Problem title…"
          placeholderTextColor={theme.textMuted}
          style={{
            fontFamily: 'SpaceGrotesk-Bold',
            fontSize: 20,
            color: theme.text,
            paddingVertical: 4,
          }}
        />
        {nb.context.label ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: -6 }}>{nb.context.label}</Text>
        ) : null}

        {nb.blocks.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            editing={editingId === block.id}
            first={i === 0}
            last={i === nb.blocks.length - 1}
            theme={theme}
            onEdit={() => block.type === 'note' && setEditingId(block.id)}
            onChangeText={(text) =>
              update((b) => b.map((x) => (x.id === block.id && x.type === 'note' ? { ...x, text } : x)))
            }
            onDone={() => setEditingId(null)}
            onRedraw={() => {
              sketchTargetRef.current = block.id;
              setDrawing(true);
            }}
            onRemove={() => remove(block.id)}
            onMove={(d) => move(block.id, d)}
          />
        ))}

        {/* Add-block bar */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
          <AddChip icon={<TypeIcon size={15} color={theme.textSoft} />} label="Text / math" onPress={addNote} theme={theme} />
          <AddChip
            icon={<Pencil size={15} color={theme.textSoft} />}
            label="Sketch"
            onPress={() => {
              sketchTargetRef.current = null;
              setDrawing(true);
            }}
            theme={theme}
          />
          <AddChip icon={<ImagePlus size={15} color={theme.textSoft} />} label="Image" onPress={addImage} theme={theme} />
        </View>
      </ScrollView>

      <DrawingCanvas visible={drawing} onClose={() => setDrawing(false)} onSend={onSketchDone} />
    </SafeAreaView>
  );
}

function BlockCard({
  block,
  editing,
  first,
  last,
  theme,
  onEdit,
  onChangeText,
  onDone,
  onRedraw,
  onRemove,
  onMove,
}: {
  block: NotebookBlock;
  editing: boolean;
  first: boolean;
  last: boolean;
  theme: ReturnType<typeof useAppTheme>;
  onEdit: () => void;
  onChangeText: (text: string) => void;
  onDone: () => void;
  onRedraw: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface,
        padding: 12,
        gap: 8,
      }}
    >
      {block.type === 'note' ? (
        editing ? (
          <TextInput
            value={block.text}
            onChangeText={onChangeText}
            onBlur={onDone}
            autoFocus
            multiline
            placeholder="Write a step. Use $x^2$ for math."
            placeholderTextColor={theme.textMuted}
            style={{
              fontFamily: 'SpaceGrotesk-Regular',
              fontSize: 14,
              color: theme.text,
              minHeight: 44,
              textAlignVertical: 'top',
            }}
          />
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={onEdit}>
            {block.text.trim() ? (
              <FormattedText text={block.text} accentColor={theme.accent} style={{ color: theme.textSoft }} />
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: 14 }}>Tap to write…</Text>
            )}
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity activeOpacity={0.85} onPress={block.type === 'sketch' ? onRedraw : undefined}>
          <Image
            source={{ uri: block.image }}
            resizeMode="contain"
            style={{ width: '100%', height: 220, borderRadius: 8, backgroundColor: '#FFFFFF' }}
          />
          {block.type === 'image' && block.name ? (
            <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
              {block.name}
            </Text>
          ) : null}
        </TouchableOpacity>
      )}

      {/* Controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <CtrlBtn disabled={first} onPress={() => onMove(-1)} theme={theme}>
          <ChevronUp size={16} color={first ? theme.textMuted : theme.textSoft} />
        </CtrlBtn>
        <CtrlBtn disabled={last} onPress={() => onMove(1)} theme={theme}>
          <ChevronDown size={16} color={last ? theme.textMuted : theme.textSoft} />
        </CtrlBtn>
        {block.type === 'sketch' ? (
          <CtrlBtn onPress={onRedraw} theme={theme}>
            <Pencil size={14} color={theme.textSoft} />
          </CtrlBtn>
        ) : null}
        <CtrlBtn onPress={onRemove} theme={theme}>
          <Trash2 size={14} color={theme.danger} />
        </CtrlBtn>
      </View>
    </View>
  );
}

function CtrlBtn({
  children,
  onPress,
  disabled,
  theme,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surfaceAlt,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

function AddChip({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        backgroundColor: theme.surface,
      }}
    >
      <Plus size={13} color={theme.textMuted} />
      {icon}
      <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: theme.textSoft }}>{label}</Text>
    </TouchableOpacity>
  );
}
